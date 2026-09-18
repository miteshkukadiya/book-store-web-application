const mongoose = require("mongoose");
const { normalizeCartForStorage } = require("../utils/cart");

const cartItemSchema = new mongoose.Schema(
    {
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
    },
    { _id: false }
);

const user = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    address:{
        type:String,
        required:true,
    },
    avatar:{
        type:String,
        default:"https://cdn-icons-png.flaticon.com/128/3177/3177440.png",
    },
    role:{
        type:String,
        default:"user",
        enum:["user","admin"]
    },
    favourites:[
        {
            type:mongoose.Types.ObjectId,
            ref:"books",
        },
    ],
    cart: [cartItemSchema],
    orders:[
        {
            type:mongoose.Types.ObjectId,
            ref:"order",
        },
        ],
},
    {timestamps:true}
);

user.pre("init", function (doc) {
    if (Array.isArray(doc.cart)) {
        doc.cart = normalizeCartForStorage(doc.cart);
    }
});

module.exports = mongoose.model("user",user);
