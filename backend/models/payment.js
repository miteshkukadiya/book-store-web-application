const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "user",
        required: true,
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    currency: {
        type: String,
        required: true,
        enum: ["INR"],
    },
    status: {
        type: String,
        required: true,
        enum: ["Created", "Verified", "Ordered"],
        default: "Created",
    },
    razorpayPaymentId: {
        type: String,
        default: null,
    },
    razorpaySignature: {
        type: String,
        default: null,
    },
    orders: [{
        type: mongoose.Types.ObjectId,
        ref: "order",
    }],
    verifiedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model("payment", paymentSchema);
