const mongoose = require("mongoose");
const user = require("./user");

const order = new mongoose.Schema({
    user:{
        type:mongoose.Types.ObjectId,
        ref:"user",
    },
    book:{
        type:mongoose.Types.ObjectId,
        ref:"books",
    },
    status:{
        type:String,
        default:"Order Placed",
        enum:["Order Placed","Out for delivery , Delivered , canceled"],
    },
},
{timestamps:true}
);

module.exports = mongoose.model("order",order);