const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "user",
        required: true,
    },
    book: {
        type: mongoose.Types.ObjectId,
        ref: "books",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: [
            "Order Placed",
            "Processing",
            "Shipped",
            "Out for delivery",
            "Delivered",
            "Canceled",
        ],
        default: "Order Placed",
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
    },
    razorpayOrderId: {
        type: String,
        default: null,
    },
    razorpayPaymentId: {
        type: String,
        default: null,
    },
    razorpaySignature: {
        type: String,
        default: null,
    },
    shippingAddress: {
        type: String,
        required: true,
    },
    canceledAt: {
        type: Date,
        default: null,
    },
    cancelReason: {
        type: String,
        default: null,
    },
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("order", orderSchema);