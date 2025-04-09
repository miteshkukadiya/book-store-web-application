const router = require("express").Router();
const express = require("express");
const book = require("../models/book");
const user = require("../models/user");
const {authenticateToken} = require("./userAuth");
const cart = require("../models/cart");



// put book to cart
router.put("/add-to-cart", authenticateToken, async(req,res) => {
try {
    const {bookid, id} = req.headers;
    const userData = await user.findById(id);
    // const cartinbook = await cart.findById(bookid);
    // console.log(cartinbook);
    const isBookinCart = userData.cart.includes(bookid);
   
    if(isBookinCart)
    {
        return res.json({
            status : "Success",
            message : "Book is already in cart",
        });
    }
    
    
    await user.findByIdAndUpdate( id , {
       $push : { cart : bookid }, 
    });

    return res.json({
        status : "Success",
        message : "Book added to cart"
    });
    

} catch (error) {
    return res.status(500).json({message : "An error occurred"});
}
});

// remove from cart
router.put("/remove-from-cart/:bookid", authenticateToken, async (req,res) => {
    try {
        const { bookid } = req.params;
        const { id } = req.headers;
        await user.findByIdAndUpdate( id, {
            $pull : { cart : bookid }, 
        });

        return res.json({
            status : "Success",
            message :  "Book removed from cart",
        });
    } catch (error) {
        return res.status(500).json({ message : "An error occurred"});
    }
});

// get cart of a particular user
router.get("/get-user-cart", authenticateToken, async (req,res) => {
    try {
        const { id } = req.headers;
        const userData = await user.findById(id).populate("cart");
        const cart = userData.cart.reverse();

        return res.json({
            status : "Success",
            data : cart,
        });
    } catch (error) {
        return res.status(500).json({message : "An error occurred"});
    }
});

// add to cart by mitesh
// router.put("/Add-To-Cart",authenticateToken, async(req,res)=>{
// try {
//     const Cart = new cart({
//         bookid:req.headers.bookid,
//         id:req.headers.id,
//          cart_Data : await user.findById(id),

//     });
//     const cart_data =  Cart.save();
//     res.status(200).json({message:"add to cart successfully",data:cart_data});
    
// } catch (error) {
//     return res.status(500).json({message : "An error occurred"});
// }

// });





module.exports = router;