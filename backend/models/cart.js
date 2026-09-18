const mongoose = require("mongoose");
const user = require("./user");

const cart = new mongoose.Schema({
    user:{
        type:mongoose.Types.ObjectId,
        ref:"user",
    },
    book:{
        type:mongoose.Types.ObjectId,
        ref:"books",
    },
    quantity:{
        type:Number,
        required:true,
        min:1,
        default:1,
    },
},
{timestamps:true}

);
module.exports = mongoose.model("cart",cart);
