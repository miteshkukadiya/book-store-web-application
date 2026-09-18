const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const { authenticateToken } = require("./userAuth");

const getUserId = (req) => {
    if (req.user?.id && mongoose.isValidObjectId(req.user.id)) return req.user.id;
    if (req.user?._id && mongoose.isValidObjectId(req.user._id)) return req.user._id;
    if (req.headers.id && mongoose.isValidObjectId(req.headers.id)) return req.headers.id;
    return null;
};

const getBookId = (req) => req.headers.bookid || req.body.bookid || req.params.bookid;

// Add book to favourites
router.put("/add-book-to-favourite", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const bookid = getBookId(req);

        if (!userId) {
            return res.status(400).json({ message: "User authentication required" });
        }

        if (!bookid || !mongoose.isValidObjectId(bookid)) {
            return res.status(400).json({ message: "Invalid book id" });
        }

        const userData = await User.findById(userId);
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        const isBookFavourite = userData.favourites.some((fav) => fav.toString() === bookid.toString());
        if (isBookFavourite) {
            return res.status(200).json({ message: "Book is already in favourites" });
        }

        await User.findByIdAndUpdate(userId, { $addToSet: { favourites: bookid } });
        return res.status(200).json({ message: "Book added to favourites" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Remove from favourites
router.put("/remove-book-from-favourite", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const bookid = getBookId(req);

        if (!userId) {
            return res.status(400).json({ message: "User authentication required" });
        }

        if (!bookid || !mongoose.isValidObjectId(bookid)) {
            return res.status(400).json({ message: "Invalid book id" });
        }

        await User.findByIdAndUpdate(userId, { $pull: { favourites: bookid } });
        return res.status(200).json({ message: "Book removed from favourites" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get favourite books of a particular user
router.get("/get-favourite-books", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(400).json({ message: "User authentication required" });
        }

        const userData = await User.findById(userId).populate("favourites");
        if (!userData) {
            return res.status(404).json({ message: "User not found" });
        }

        const favouriteBooks = (userData.favourites || []).filter(Boolean);
        return res.json({
            status: "Success",
            data: favouriteBooks,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred" });
    }
});

module.exports = router;