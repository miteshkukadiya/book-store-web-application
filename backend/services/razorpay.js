const Razorpay = require("razorpay");

const createRazorpayClient = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Razorpay configuration is missing");
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
};

module.exports = { createRazorpayClient };
