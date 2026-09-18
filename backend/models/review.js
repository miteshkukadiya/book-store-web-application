const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        book: {
            type: mongoose.Types.ObjectId,
            ref: "books",
            required: true,
        },
        user: {
            type: mongoose.Types.ObjectId,
            ref: "user",
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
        },
    },
    { timestamps: true }
);

// One review per user per book
reviewSchema.index({ book: 1, user: 1 }, { unique: true });
reviewSchema.index({ book: 1, createdAt: -1 });

module.exports = mongoose.model("review", reviewSchema);

