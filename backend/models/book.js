const mongoose = require("mongoose");
const book = new mongoose.Schema(
{
    url:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    author:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
        validate: {
            validator: (value) => Number.isFinite(value) && value > 0,
            message: "Price must be a positive number",
        },
    },
    desc:{
        type:String,
        required:true,
    },
    language:{
        type:String,
        required:true,
    },
    stock: {
        type: Number,
        required: true,
        default: 10,
        min: 0,
    },
    lowStockThreshold: {
        type: Number,
        required: true,
        default: 5,
        min: 0,
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0,
    },
},
{timestamps:true}
);

book.index({ title: "text", author: "text" });
book.index({ price: 1 });
book.index({ language: 1 });
book.index({ stock: 1 });
book.index({ createdAt: -1 });

module.exports = mongoose.model("books",book);