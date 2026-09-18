const router = require("express").Router();
const mongoose = require("mongoose");
const Review = require("../models/review");
const Book = require("../models/book");
const User = require("../models/user");
const { authenticateToken, isAdmin } = require("./userAuth");

const getUserId = (req) => {
    if (req.user?.id && mongoose.isValidObjectId(req.user.id)) return req.user.id;
    if (req.user?._id && mongoose.isValidObjectId(req.user._id)) return req.user._id;
    if (req.headers.id && mongoose.isValidObjectId(req.headers.id)) return req.headers.id;
    return null;
};

// Helper: Recalculate and update book's averageRating and totalReviews
const updateBookRatingStats = async (bookId) => {
    try {
        const stats = await Review.aggregate([
            { $match: { book: new mongoose.Types.ObjectId(bookId) } },
            {
                $group: {
                    _id: "$book",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 },
                },
            },
        ]);

        if (stats.length > 0) {
            await Book.findByIdAndUpdate(bookId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews,
            });
        } else {
            await Book.findByIdAndUpdate(bookId, {
                averageRating: 0,
                totalReviews: 0,
            });
        }
    } catch (err) {
        console.error("Error updating book rating stats:", err.message);
    }
};

// Add a review for a book (1 review per user/book)
router.post("/add-review/:bookId", authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { rating, comment } = req.body;
        const userId = getUserId(req);

        if (!mongoose.isValidObjectId(bookId)) {
            return res.status(400).json({ message: "Invalid book id" });
        }

        if (!userId) {
            return res.status(401).json({ message: "User authentication required" });
        }

        const numRating = Number(rating);
        if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
        }

        if (!comment || !comment.trim()) {
            return res.status(400).json({ message: "Review comment is required" });
        }

        const bookExists = await Book.findById(bookId);
        if (!bookExists) {
            return res.status(404).json({ message: "Book not found" });
        }

        const existingReview = await Review.findOne({ book: bookId, user: userId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this book" });
        }

        const newReview = new Review({
            book: bookId,
            user: userId,
            rating: numRating,
            comment: comment.trim(),
        });

        await newReview.save();
        await updateBookRatingStats(bookId);

        const populatedReview = await Review.findById(newReview._id).populate("user", "username avatar");

        return res.status(201).json({
            status: "Success",
            message: "Review added successfully",
            data: populatedReview,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "You have already reviewed this book" });
        }
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Update own review
router.put("/update-review/:reviewId", authenticateToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const userId = getUserId(req);

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        if (review.user.toString() !== userId?.toString()) {
            return res.status(403).json({ message: "You can only update your own review" });
        }

        if (rating !== undefined) {
            const numRating = Number(rating);
            if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
                return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
            }
            review.rating = numRating;
        }

        if (comment !== undefined) {
            if (!comment.trim()) {
                return res.status(400).json({ message: "Review comment cannot be empty" });
            }
            review.comment = comment.trim();
        }

        await review.save();
        await updateBookRatingStats(review.book);

        const updatedReview = await Review.findById(review._id).populate("user", "username avatar");

        return res.status(200).json({
            status: "Success",
            message: "Review updated successfully",
            data: updatedReview,
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Delete a review (owner or admin)
router.delete("/delete-review/:reviewId", authenticateToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = getUserId(req);

        if (!mongoose.isValidObjectId(reviewId)) {
            return res.status(400).json({ message: "Invalid review id" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Check if caller is owner or admin
        const isOwner = review.user.toString() === userId?.toString();
        let isUserAdmin = false;
        if (!isOwner && userId) {
            const userObj = await User.findById(userId).select("role");
            if (userObj?.role === "admin") {
                isUserAdmin = true;
            }
        }

        if (!isOwner && !isUserAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        const bookId = review.book;
        await Review.findByIdAndDelete(reviewId);
        await updateBookRatingStats(bookId);

        return res.status(200).json({
            status: "Success",
            message: "Review deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get reviews for a book
router.get("/get-reviews/:bookId", async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!mongoose.isValidObjectId(bookId)) {
            return res.status(400).json({ message: "Invalid book id" });
        }

        const reviews = await Review.find({ book: bookId })
            .populate("user", "username avatar")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            status: "Success",
            data: reviews,
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get all reviews for admin moderation
router.get("/admin/get-all-reviews", authenticateToken, isAdmin, async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate("user", "username email avatar")
            .populate("book", "title url price")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            status: "Success",
            data: reviews,
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
