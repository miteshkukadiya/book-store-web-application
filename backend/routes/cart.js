const router = require("express").Router();
const mongoose = require("mongoose");
const Book = require("../models/book");
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");
const {
    buildCartResponse,
    getCartItemBookId,
    getStockValidationError,
    normalizeCartForStorage,
    normalizeQuantity,
    toObjectId,
} = require("../utils/cart");

const getAuthenticatedUsername = (req) => {
    const usernameClaim = req.user?.authclaims?.find((claim) => claim.name)?.name;
    return usernameClaim || req.user?.username || req.user?.name;
};

const findAuthenticatedUser = async (req) => {
    const username = getAuthenticatedUsername(req);
    return username ? User.findOne({ username }) : null;
};

const isValidBookId = (bookid) => Boolean(bookid && mongoose.isValidObjectId(bookid));

const hasSameCartShape = (cart, normalizedCart) => {
    if (!Array.isArray(cart) || cart.length !== normalizedCart.length) {
        return false;
    }

    return cart.every((cartItem, index) => (
        Boolean(cartItem?.book)
        && getCartItemBookId(cartItem) === getCartItemBookId(normalizedCart[index])
        && normalizeQuantity(cartItem.quantity) === normalizedCart[index].quantity
    ));
};

const persistNormalizedCart = async (userId) => {
    const objectId = toObjectId(userId);
    if (!objectId) {
        return [];
    }

    const rawUser = await User.collection.findOne(
        { _id: objectId },
        { projection: { cart: 1 } }
    );
    const normalizedCart = normalizeCartForStorage(rawUser?.cart || []);

    if (!hasSameCartShape(rawUser?.cart || [], normalizedCart)) {
        await User.collection.updateOne(
            { _id: objectId },
            { $set: { cart: normalizedCart } }
        );
    }

    return normalizedCart;
};

const findCartItem = (cart, bookid) => {
    const bookIdString = toObjectId(bookid)?.toString();
    return (cart || []).find((cartItem) => getCartItemBookId(cartItem) === bookIdString);
};

const saveNormalizedUserCart = async (userData) => {
    userData.cart = normalizeCartForStorage(userData.cart);
    await userData.save();
};

const sendCartResponse = async (res, userId, statusCode, message) => {
    await persistNormalizedCart(userId);
    const populatedUser = await User.findById(userId).populate("cart.book");
    if (!populatedUser) {
        return res.status(404).json({ message: "User not found" });
    }

    const cartSummary = buildCartResponse((populatedUser.cart || []).slice().reverse());
    return res.status(statusCode).json({
        status: "Success",
        message,
        data: cartSummary.items,
        totalQuantity: cartSummary.totalQuantity,
        cartTotal: cartSummary.cartTotal,
    });
};

// Add a book to the authenticated user's cart.
router.put("/add-to-cart", authenticateToken, async (req, res) => {
    const { bookid } = req.headers;
    if (!isValidBookId(bookid)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    try {
        const [userData, bookData] = await Promise.all([
            findAuthenticatedUser(req),
            Book.findById(bookid),
        ]);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!bookData) {
            return res.status(404).json({ message: "Book not found" });
        }

        const addQuantity = normalizeQuantity(req.body?.quantity);
        const existingCartItem = findCartItem(userData.cart, bookData._id);

        if (existingCartItem) {
            const nextQuantity = normalizeQuantity(existingCartItem.quantity) + addQuantity;
            const stockError = getStockValidationError(bookData, nextQuantity);
            if (stockError) {
                return res.status(400).json({ message: stockError });
            }

            existingCartItem.quantity = nextQuantity;
            await saveNormalizedUserCart(userData);
            return sendCartResponse(res, userData._id, 200, "Book quantity updated in cart");
        }

        const stockError = getStockValidationError(bookData, addQuantity);
        if (stockError) {
            return res.status(400).json({ message: stockError });
        }

        userData.cart.push({ book: bookData._id, quantity: addQuantity });
        await saveNormalizedUserCart(userData);
        return sendCartResponse(res, userData._id, 200, "Book added to cart");
    } catch (error) {
        return res.status(500).json({ message: "Unable to update cart" });
    }
});

// Increase quantity for a book already in the authenticated user's cart.
router.put("/increment-cart/:bookid", authenticateToken, async (req, res) => {
    const { bookid } = req.params;
    if (!isValidBookId(bookid)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    try {
        const [userData, bookData] = await Promise.all([
            findAuthenticatedUser(req),
            Book.findById(bookid),
        ]);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!bookData) {
            return res.status(404).json({ message: "Book not found" });
        }

        const existingCartItem = findCartItem(userData.cart, bookData._id);
        if (!existingCartItem) {
            return res.status(404).json({ message: "Book is not in cart" });
        }

        const nextQuantity = normalizeQuantity(existingCartItem.quantity) + 1;
        const stockError = getStockValidationError(bookData, nextQuantity);
        if (stockError) {
            return res.status(400).json({ message: stockError });
        }

        existingCartItem.quantity = nextQuantity;
        await saveNormalizedUserCart(userData);
        return sendCartResponse(res, userData._id, 200, "Cart quantity increased");
    } catch (error) {
        return res.status(500).json({ message: "Unable to update cart" });
    }
});

// Decrease quantity for a book in the authenticated user's cart without going below 1.
router.put("/decrement-cart/:bookid", authenticateToken, async (req, res) => {
    const { bookid } = req.params;
    if (!isValidBookId(bookid)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    try {
        const userData = await findAuthenticatedUser(req);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        const existingCartItem = findCartItem(userData.cart, bookid);
        if (!existingCartItem) {
            return res.status(404).json({ message: "Book is not in cart" });
        }

        const currentQuantity = normalizeQuantity(existingCartItem.quantity);
        if (currentQuantity === 1) {
            return sendCartResponse(res, userData._id, 200, "Quantity cannot go below 1");
        }

        existingCartItem.quantity = currentQuantity - 1;
        await saveNormalizedUserCart(userData);
        return sendCartResponse(res, userData._id, 200, "Cart quantity decreased");
    } catch (error) {
        return res.status(500).json({ message: "Unable to update cart" });
    }
});

// Remove a book from the authenticated user's cart.
router.put("/remove-from-cart/:bookid", authenticateToken, async (req, res) => {
    const { bookid } = req.params;
    if (!isValidBookId(bookid)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    try {
        const userData = await findAuthenticatedUser(req);

        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        const normalizedCart = normalizeCartForStorage(userData.cart);
        const nextCart = normalizedCart.filter((cartItem) => getCartItemBookId(cartItem) !== bookid);

        if (nextCart.length === normalizedCart.length) {
            return res.status(404).json({ message: "Book is not in cart" });
        }

        userData.cart = nextCart;
        await userData.save();
        return sendCartResponse(res, userData._id, 200, "Book removed from cart");
    } catch (error) {
        return res.status(500).json({ message: "Unable to update cart" });
    }
});

// Get the authenticated user's populated cart.
router.get("/get-user-cart", authenticateToken, async (req, res) => {
    try {
        const userData = await findAuthenticatedUser(req);
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        await persistNormalizedCart(userData._id);
        const populatedUser = await User.findById(userData._id).populate("cart.book");
        if (!populatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const cartSummary = buildCartResponse((populatedUser.cart || []).slice().reverse());

        return res.status(200).json({
            status: "Success",
            data: cartSummary.items,
            totalQuantity: cartSummary.totalQuantity,
            cartTotal: cartSummary.cartTotal,
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to fetch cart" });
    }
});

module.exports = router;
