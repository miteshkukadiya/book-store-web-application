import { useState } from "react";
import PropTypes from "prop-types";
import api from "../../api/axios";

let razorpayScriptPromise;

const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => {
      razorpayScriptPromise = undefined;
      reject(new Error("Unable to load Razorpay Checkout"));
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

const getHeaders = () => ({
  id: localStorage.getItem("id"),
  authorization: `Bearer ${localStorage.getItem("token")}`,
});

const RazorpayPaymentButton = ({ cartItems = [], userInfo, onSuccess, onError, onBeforePayment }) => {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");

  const startPayment = async () => {
    if (!cartItems.length || loading) {
      return;
    }

    try {
      setLoading(true);
      setStage("creating");
      if (onBeforePayment) {
        await onBeforePayment();
      }
      const headers = getHeaders();
      const response = await api.post(
        "/payment/create-order",
        { items: cartItems },
        { headers }
      );
      const paymentOrder = response.data.data;

      setStage("opening");
      await loadRazorpayScript();
      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Book Store",
        description: "Book purchase",
        order_id: paymentOrder.orderId,
        prefill: {
          name: userInfo?.username || "",
          email: userInfo?.email || "",
        },
        handler: async (paymentResponse) => {
          try {
            setStage("verifying");
            await api.post(
              "/payment/verify",
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              },
              { headers }
            );
            setLoading(false);
            setStage("");
            onSuccess();
          } catch (error) {
            setLoading(false);
            setStage("");
            onError(error.response?.data?.message || "Payment succeeded, but order creation could not be confirmed");
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStage("");
            onError("Payment checkout was closed.");
          },
        },
      });

      checkout.on("payment.failed", (responseData) => {
        setLoading(false);
        setStage("");
        onError(responseData.error?.description || "Payment failed");
      });
      checkout.open();
    } catch (error) {
      setLoading(false);
      setStage("");
      onError(error.response?.data?.message || error.message || "Unable to start payment");
    }
  };

  const label = {
    creating: "Creating payment order...",
    opening: "Opening Razorpay...",
    verifying: "Confirming payment...",
  }[stage] || "Pay with Razorpay";

  return (
    <button
      className="bg-zinc-100 text-zinc-900 rounded px-4 py-2 flex justify-center w-full font-semibold hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      onClick={startPayment}
      disabled={!cartItems.length || loading}
    >
      {label}
    </button>
  );
};

RazorpayPaymentButton.propTypes = {
  cartItems: PropTypes.arrayOf(PropTypes.shape({
    book: PropTypes.string.isRequired,
    quantity: PropTypes.number.isRequired,
  })).isRequired,
  userInfo: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
  }),
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onBeforePayment: PropTypes.func,
};

export default RazorpayPaymentButton;
