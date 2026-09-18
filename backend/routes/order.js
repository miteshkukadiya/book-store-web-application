const router = require("express").Router();
const mongoose = require("mongoose");
const { authenticateToken, isAdmin } = require("./userAuth");
const Book = require("../models/book");
const Order = require("../models/order");
const User = require("../models/user");
const {
    getBookPrice,
    getStockValidationError,
    normalizeQuantity,
    toObjectId,
} = require("../utils/cart");

const allowedStatuses = [
    "Order Placed",
    "Processing",
    "Shipped",
    "Out for delivery",
    "Delivered",
    "Canceled",
];

const getUserId = (req) => {
    if (req.user?.id && mongoose.isValidObjectId(req.user.id)) return req.user.id;
    if (req.user?._id && mongoose.isValidObjectId(req.user._id)) return req.user._id;
    if (req.headers.id && mongoose.isValidObjectId(req.headers.id)) return req.headers.id;
    return null;
};

const getOrderBookId = (orderData) => {
    const bookValue = orderData?.book || orderData?._id;
    const bookObjectId = toObjectId(bookValue);
    return bookObjectId ? bookObjectId.toString() : null;
};

// Place order (Cash on Delivery / Manual)
router.post("/place-order", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { order, shippingAddress } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "Authentication required" });
        }

        if (!Array.isArray(order) || order.length === 0) {
            return res.status(400).json({ message: "Order items are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const address = (shippingAddress || user.address || "").trim();
        if (!address) {
            return res.status(400).json({ message: "Shipping address is required" });
        }

        const orderItems = order.map((orderData) => ({
            bookId: getOrderBookId(orderData),
            quantity: normalizeQuantity(orderData?.quantity),
            shippingAddress: orderData?.shippingAddress,
        }));

        if (orderItems.some((orderItem) => !mongoose.isValidObjectId(orderItem.bookId))) {
            return res.status(400).json({ message: "Invalid book id in order" });
        }

        const uniqueBookIds = [...new Set(orderItems.map((orderItem) => orderItem.bookId))];
        const books = await Book.find({ _id: { $in: uniqueBookIds } });
        const bookById = new Map(books.map((book) => [book._id.toString(), book]));

        if (uniqueBookIds.some((bookId) => !bookById.has(bookId))) {
            return res.status(404).json({ message: "One or more books are no longer available" });
        }

        // Validate stock before proceeding
        for (const orderItem of orderItems) {
            const book = bookById.get(orderItem.bookId);
            const stockError = getStockValidationError(book, orderItem.quantity);
            if (stockError) {
                return res.status(400).json({ message: stockError });
            }
        }

        const savedOrders = [];

        for (const orderItem of orderItems) {
            const book = bookById.get(orderItem.bookId);
            const price = getBookPrice(book);
            const totalAmount = price * orderItem.quantity;

            // Atomically decrement stock
            const updatedBook = await Book.findOneAndUpdate(
                { _id: orderItem.bookId, stock: { $gte: orderItem.quantity } },
                { $inc: { stock: -orderItem.quantity } },
                { new: true }
            );

            if (!updatedBook) {
                return res.status(400).json({
                    message: `Insufficient stock for "${book.title}". Please adjust quantity.`,
                });
            }

            const newOrder = new Order({
                user: userId,
                book: orderItem.bookId,
                quantity: orderItem.quantity,
                price,
                totalAmount,
                status: "Order Placed",
                paymentStatus: "Pending",
                shippingAddress: address,
            });

            const orderDataFromDb = await newOrder.save();

            await User.findByIdAndUpdate(userId, {
                $push: { orders: orderDataFromDb._id },
                $pull: { cart: { book: orderItem.bookId } },
            });

            await User.collection.updateOne(
                { _id: toObjectId(userId) },
                { $pull: { cart: toObjectId(orderItem.bookId) } }
            );

            savedOrders.push(orderDataFromDb);
        }

        return res.status(201).json({
            status: "Success",
            message: "Order Placed Successfully",
            data: savedOrders,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred while placing order" });
    }
});

// Get order history of particular user
router.get("/get-order-history", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ message: "User identification required" });
        }

        const orders = await Order.find({ user: userId })
            .populate("book")
            .sort({ createdAt: -1 });

        return res.json({
            status: "Success",
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred fetching order history" });
    }
});

// Get order by id
router.get("/get-order-by-id/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const order = await Order.findById(id).populate("book").populate("user", "username email");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check permission (owner or admin)
        const isOwner = order.user?._id?.toString() === userId?.toString();
        let isUserAdmin = false;
        if (!isOwner && userId) {
            const userObj = await User.findById(userId).select("role");
            if (userObj?.role === "admin") isUserAdmin = true;
        }

        if (!isOwner && !isUserAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        return res.json({
            status: "Success",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred" });
    }
});

// Cancel order (User or Admin)
router.put("/cancel-order/:id", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        const { reason } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid order id" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const isOwner = order.user.toString() === userId?.toString();
        let isUserAdmin = false;
        if (!isOwner && userId) {
            const userObj = await User.findById(userId).select("role");
            if (userObj?.role === "admin") isUserAdmin = true;
        }

        if (!isOwner && !isUserAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (order.status === "Canceled") {
            return res.status(400).json({ message: "Order is already canceled" });
        }

        // Only allow user cancellation before shipping
        if (!isUserAdmin && !["Order Placed", "Processing"].includes(order.status)) {
            return res.status(400).json({
                message: `Order cannot be canceled because it is already ${order.status}`,
            });
        }

        order.status = "Canceled";
        order.canceledAt = new Date();
        order.cancelReason = reason || "Canceled by customer";
        await order.save();

        // Restore inventory stock
        if (order.book) {
            await Book.findByIdAndUpdate(order.book, {
                $inc: { stock: order.quantity || 1 },
            });
        }

        return res.json({
            status: "Success",
            message: "Order canceled successfully and inventory restored",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred while canceling order" });
    }
});

// Get all orders ---admin
router.get("/get-all-orders", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};

        if (status && status !== "All") {
            filter.status = status;
        }

        const orders = await Order.find(filter)
            .populate("book")
            .populate("user", "username email address avatar")
            .sort({ createdAt: -1 });

        return res.json({
            status: "Success",
            data: orders,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred fetching orders" });
    }
});

// Update order status --admin
router.put("/update-status/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid order status" });
        }

        const existingOrder = await Order.findById(id);
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        const previousStatus = existingOrder.status;
        existingOrder.status = status;

        if (status === "Canceled" && previousStatus !== "Canceled") {
            existingOrder.canceledAt = new Date();
            existingOrder.cancelReason = "Canceled by Admin";
            // Restore inventory
            if (existingOrder.book) {
                await Book.findByIdAndUpdate(existingOrder.book, {
                    $inc: { stock: existingOrder.quantity || 1 },
                });
            }
        } else if (previousStatus === "Canceled" && status !== "Canceled") {
            // Re-check and reduce stock if reviving a canceled order
            if (existingOrder.book) {
                await Book.findByIdAndUpdate(existingOrder.book, {
                    $inc: { stock: -(existingOrder.quantity || 1) },
                });
            }
        }

        await existingOrder.save();

        return res.json({
            status: "Success",
            message: "Status Updated Successfully",
            data: existingOrder,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred updating status" });
    }
});

module.exports = router;
