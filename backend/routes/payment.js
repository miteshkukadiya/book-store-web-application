const crypto = require("crypto");
const mongoose = require("mongoose");
const router = require("express").Router();
const Book = require("../models/book");
const Order = require("../models/order");
const Payment = require("../models/payment");
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");
const { createRazorpayClient } = require("../services/razorpay");
const {
    getBookPrice,
    getCartItemBookId,
    getStockValidationError,
    normalizeCartForStorage,
    normalizeQuantity,
} = require("../utils/cart");

class PaymentError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const getAuthenticatedUsername = (req) => {
    const usernameClaim = req.user?.authclaims?.find((claim) => claim.name)?.name;
    return usernameClaim || req.user?.username || req.user?.name;
};

const findAuthenticatedUser = (req) => {
    const username = getAuthenticatedUsername(req);
    return username ? User.findOne({ username }).select("_id address cart") : null;
};

const hasMatchingPaymentDetails = (payment, razorpayPaymentId, razorpaySignature) => (
    payment.razorpayPaymentId === razorpayPaymentId
    && payment.razorpaySignature === razorpaySignature
);

const getOrdersForPayment = async (payment, session) => {
    if (!payment.orders?.length) {
        throw new PaymentError(409, "Payment has no bookstore orders");
    }

    return Order.find({ _id: { $in: payment.orders } })
        .populate("book")
        .session(session)
        .lean();
};

const verifySignature = (payment, razorpayPaymentId, razorpaySignature) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new PaymentError(500, "Payment verification unavailable");
    }

    const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${payment.razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedSignatureBuffer = Buffer.from(razorpaySignature, "utf8");

    if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length
        || !crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
        throw new PaymentError(400, "Invalid payment signature");
    }
};

router.post("/payment/create-order", authenticateToken, async (req, res) => {
    try {
        const user = await findAuthenticatedUser(req);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const cartItems = normalizeCartForStorage(user.cart || []);
        if (cartItems.length === 0) {
            return res.status(400).json({ message: "Cart cannot be empty" });
        }

        const cartBookIds = cartItems.map((cartItem) => getCartItemBookId(cartItem));
        if (cartBookIds.some((bookId) => !mongoose.isValidObjectId(bookId))) {
            return res.status(400).json({ message: "Invalid book id" });
        }

        const books = await Book.find({ _id: { $in: cartBookIds } }).select("price title stock");
        const bookById = new Map(books.map((book) => [book._id.toString(), book]));
        const foundBookIds = new Set(books.map((book) => book._id.toString()));
        const missingBookIds = cartBookIds.filter((bookId) => !foundBookIds.has(bookId));

        if (missingBookIds.length > 0) {
            return res.status(404).json({ message: "One or more books are no longer available" });
        }

        const amount = cartItems.reduce((total, cartItem) => {
            const book = bookById.get(getCartItemBookId(cartItem));
            const quantity = normalizeQuantity(cartItem.quantity);
            const stockError = getStockValidationError(book, quantity);
            if (stockError) {
                throw new PaymentError(400, stockError);
            }

            const priceInPaise = Math.round(getBookPrice(book) * 100);
            return total + (priceInPaise * quantity);
        }, 0);

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return res.status(400).json({ message: "Cart total must be greater than zero" });
        }

        const razorpayOrder = await createRazorpayClient().orders.create({
            amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        });

        await Payment.create({
            user: user._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        });

        return res.status(201).json({
            status: "Success",
            data: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 502).json({
            message: error.statusCode ? error.message : "Unable to create payment order",
        });
    }
});

router.post("/payment/verify", authenticateToken, async (req, res) => {
    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
    } = req.body;

    if ([razorpayOrderId, razorpayPaymentId, razorpaySignature]
        .some((value) => typeof value !== "string" || !value.trim())) {
        return res.status(400).json({ message: "Payment verification details are required" });
    }

    const session = await mongoose.startSession();
    let result;

    try {
        await session.withTransaction(async () => {
            const userQuery = findAuthenticatedUser(req);
            const user = userQuery ? await userQuery.session(session) : null;
            if (!user) {
                throw new PaymentError(404, "User not found");
            }

            const payment = await Payment.findOne({ razorpayOrderId }).session(session);
            if (!payment) {
                throw new PaymentError(404, "Payment order not found");
            }

            if (!payment.user.equals(user._id)) {
                throw new PaymentError(403, "Payment order access denied");
            }

            if (payment.status === "Ordered") {
                if (!hasMatchingPaymentDetails(payment, razorpayPaymentId, razorpaySignature)) {
                    throw new PaymentError(400, "Payment order has already been processed");
                }

                result = {
                    message: "Payment and bookstore order already processed",
                    statusCode: 200,
                    orders: await getOrdersForPayment(payment, session),
                };
                return;
            }

            if (payment.status === "Verified") {
                if (!hasMatchingPaymentDetails(payment, razorpayPaymentId, razorpaySignature)) {
                    throw new PaymentError(400, "Payment order has already been verified");
                }
            } else {
                verifySignature(payment, razorpayPaymentId, razorpaySignature);
                payment.status = "Verified";
                payment.razorpayPaymentId = razorpayPaymentId;
                payment.razorpaySignature = razorpaySignature;
                payment.verifiedAt = new Date();
            }

            const currentUser = await User.findById(user._id).session(session);
            if (!currentUser) {
                throw new PaymentError(404, "User not found");
            }

            const cartItems = normalizeCartForStorage(currentUser.cart || []);
            if (cartItems.length === 0) {
                throw new PaymentError(400, "Cart cannot be empty");
            }

            const cartBookIds = cartItems.map((cartItem) => getCartItemBookId(cartItem));
            const books = await Book.find({ _id: { $in: cartBookIds } })
                .select("url title author price desc language stock")
                .session(session);
            const bookById = new Map(books.map((book) => [book._id.toString(), book]));
            const foundBookIds = new Set(books.map((book) => book._id.toString()));
            if (cartBookIds.some((bookId) => !foundBookIds.has(bookId))) {
                throw new PaymentError(409, "One or more books in the cart are no longer available");
            }

            const currentCartAmount = cartItems.reduce((total, cartItem) => {
                const book = bookById.get(getCartItemBookId(cartItem));
                const quantity = normalizeQuantity(cartItem.quantity);
                const stockError = getStockValidationError(book, quantity);
                if (stockError) {
                    throw new PaymentError(409, stockError);
                }

                return total + (Math.round(getBookPrice(book) * 100) * quantity);
            }, 0);
            if (currentCartAmount !== payment.amount) {
                throw new PaymentError(409, "Cart contents have changed since payment was created");
            }

            const orderDocuments = cartItems.map((cartItem) => {
                const book = bookById.get(getCartItemBookId(cartItem));
                const quantity = normalizeQuantity(cartItem.quantity);
                const price = getBookPrice(book);

                return {
                    user: currentUser._id,
                    book: book._id,
                    quantity,
                    price,
                    totalAmount: price * quantity,
                    status: "Order Placed",
                    paymentStatus: "Paid",
                    razorpayOrderId: payment.razorpayOrderId,
                    razorpayPaymentId,
                    razorpaySignature,
                    shippingAddress: currentUser.address,
                };
            });

            // Decrement inventory stock inside session
            for (const cartItem of cartItems) {
                const book = bookById.get(getCartItemBookId(cartItem));
                const quantity = normalizeQuantity(cartItem.quantity);
                const updatedBook = await Book.findOneAndUpdate(
                    { _id: book._id, stock: { $gte: quantity } },
                    { $inc: { stock: -quantity } },
                    { session, new: true }
                );

                if (!updatedBook) {
                    throw new PaymentError(409, `Insufficient stock for "${book.title}"`);
                }
            }

            const createdOrders = await Order.insertMany(orderDocuments, { session });
            const orderIds = createdOrders.map((order) => order._id);

            await User.updateOne(
                { _id: currentUser._id },
                {
                    $set: { cart: [] },
                    $push: { orders: { $each: orderIds } },
                },
                { session }
            );

            payment.status = "Ordered";
            payment.orders = orderIds;
            await payment.save({ session });

            result = {
                message: "Payment verified and order created successfully",
                statusCode: 201,
                orders: await Order.find({ _id: { $in: orderIds } })
                    .populate("book")
                    .session(session)
                    .lean(),
            };
        });

        return res.status(result.statusCode).json({
            status: "Success",
            message: result.message,
            data: result.orders,
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: error.statusCode ? error.message : "Unable to verify payment and create order",
        });
    } finally {
        await session.endSession();
    }
});

// Razorpay Webhook Endpoint
router.post("/payment/webhook", async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        if (webhookSecret && signature) {
            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(body)
                .digest("hex");

            if (expectedSignature !== signature) {
                return res.status(400).json({ status: "error", message: "Invalid webhook signature" });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload;

        if (event === "payment.captured") {
            const paymentEntity = payload?.payment?.entity;
            const razorpayOrderId = paymentEntity?.order_id;
            const razorpayPaymentId = paymentEntity?.id;

            if (razorpayOrderId) {
                await Payment.findOneAndUpdate(
                    { razorpayOrderId, status: "Created" },
                    {
                        $set: {
                            status: "Verified",
                            razorpayPaymentId,
                            verifiedAt: new Date(),
                        },
                    }
                );
            }
        } else if (event === "payment.failed") {
            const paymentEntity = payload?.payment?.entity;
            const razorpayOrderId = paymentEntity?.order_id;

            if (razorpayOrderId) {
                await Order.updateMany(
                    { razorpayOrderId, paymentStatus: "Pending" },
                    { $set: { paymentStatus: "Failed" } }
                );
            }
        }

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        console.error("Webhook processing error:", error.message);
        return res.status(500).json({ status: "error", message: "Webhook handler failed" });
    }
});

module.exports = router;
