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
},
{timestamps:true}

);
module.exports = mongoose.model("cart",cart);