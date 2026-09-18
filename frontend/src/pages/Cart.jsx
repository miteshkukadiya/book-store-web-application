import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Loader from "../components/Loader/Loader";
import { AiFillDelete } from "react-icons/ai";
import { FaMinus, FaPlus, FaArrowRight } from "react-icons/fa";
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

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

const normalizeQuantity = (quantity = 1) => {
  const parsedQuantity = Number(quantity);
  return Number.isInteger(parsedQuantity) && parsedQuantity >= 1 ? parsedQuantity : 1;
};

const getBookPrice = (book) => {
  const price = Number(book?.price);
  return Number.isFinite(price) && price > 0 ? price : 0;
};

const getItemSubtotal = (item) => {
  const subtotal = Number(item?.subtotal);
  if (Number.isFinite(subtotal) && subtotal >= 0) {
    return subtotal;
  }

  return getBookPrice(item?.book) * normalizeQuantity(item?.quantity);
};

const normalizeCartItems = (items = []) => (
  (items || [])
    .map((item) => {
      const book = item?.book || item;
      if (!book?._id) {
        return null;
      }

      const quantity = normalizeQuantity(item?.quantity);
      return {
        ...item,
        book,
        quantity,
        subtotal: getItemSubtotal({ ...item, book, quantity }),
      };
    })
    .filter(Boolean)
);

const formatAmount = (amount) => {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount)) {
    return "0";
  }

  return Number.isInteger(parsedAmount) ? parsedAmount : parsedAmount.toFixed(2);
};

const getBookId = (cartItem) => cartItem?.book?._id || cartItem?._id;

const Cart = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [cart, setCart] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingBookId, setDeletingBookId] = useState("");
  const [updatingBookId, setUpdatingBookId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStage, setPaymentStage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const getHeaders = () => ({
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const headers = getHeaders();
        const [cartResponse, userResponse] = await Promise.allSettled([
          api.get("/get-user-cart", { headers }),
          api.get("/get-user-information", { headers }),
        ]);

        if (cartResponse.status === "rejected") {
          throw cartResponse.reason;
        }

        setCart(normalizeCartItems(cartResponse.value.data.data));
        if (userResponse.status === "fulfilled") {
          setUserInfo(userResponse.value.data);
        }
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Unable to load your cart");
        setCart([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const deleteItem = async (bookid) => {
    try {
      setError("");
      setDeletingBookId(bookid);
      const response = await api.put(`/remove-from-cart/${bookid}`, {}, { headers: getHeaders() });
      const responseCart = normalizeCartItems(response.data.data);
      setCart((currentCart) => (
        responseCart.length || Array.isArray(response.data.data)
          ? responseCart
          : (currentCart || []).filter((cartItem) => getBookId(cartItem) !== bookid)
      ));
      showToast(response.data.message || "Removed from cart", "info");
    } catch (deleteError) {
      const msg = deleteError.response?.data?.message || "Unable to remove book from cart";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDeletingBookId("");
    }
  };

  const updateQuantity = async (bookid, action, currentQty, stockLimit) => {
    if (action === "increment" && stockLimit !== undefined && currentQty >= stockLimit) {
      showToast(`Only ${stockLimit} copies available in stock`, "warning");
      return;
    }
    try {
      setError("");
      setUpdatingBookId(`${action}-${bookid}`);
      const response = await api.put(`/${action}-cart/${bookid}`, {}, { headers: getHeaders() });
      setCart(normalizeCartItems(response.data.data));
    } catch (quantityError) {
      const msg = quantityError.response?.data?.message || "Unable to update quantity";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setUpdatingBookId("");
    }
  };

  const subtotal = (cart || []).reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const totalQuantity = (cart || []).reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0);
  const totalAmount = subtotal;

  const payWithRazorpay = async () => {
    if (!cart?.length || paymentLoading) {
      return;
    }

    try {
      setError("");
      setPaymentMessage("");
      setPaymentStage("creating");
      setPaymentLoading(true);
      const headers = getHeaders();
      const orderResponse = await api.post(
        "/payment/create-order",
        { items: cart.map((cartItem) => ({ book: getBookId(cartItem), quantity: cartItem.quantity })) },
        { headers }
      );

      setPaymentStage("opening");
      await loadRazorpayScript();
      const paymentOrder = orderResponse.data.data;
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
            setPaymentStage("verifying");
            await api.post(
              "/payment/verify",
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              },
              { headers }
            );
            setPaymentMessage("Payment successful. Order created. Redirecting to order history...");
            setPaymentLoading(false);
            setPaymentStage("");
            setTimeout(() => navigate("/profile/orderHistory"), 1200);
          } catch (verifyError) {
            setError(verifyError.response?.data?.message || "Payment succeeded, but order creation could not be confirmed");
            setPaymentLoading(false);
            setPaymentStage("");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentMessage("Payment checkout was closed.");
            setPaymentLoading(false);
            setPaymentStage("");
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed");
        setPaymentLoading(false);
        setPaymentStage("");
      });

      checkout.open();
    } catch (paymentError) {
      setError(paymentError.response?.data?.message || paymentError.message || "Unable to start payment");
      setPaymentLoading(false);
      setPaymentStage("");
    }
  };

  const paymentButtonLabel = {
    creating: "Creating payment order...",
    opening: "Opening Razorpay...",
    verifying: "Confirming payment...",
  }[paymentStage] || "Proceed to Payment";

  return (
    <div className="bg-zinc-900 px-4 md:px-12 min-h-screen py-8">
      {loading && (
        <div className="w-full h-[100%] flex items-center justify-center">
          <Loader />{" "}
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 rounded bg-red-100 p-4 text-red-700">{error}</div>
      )}

      {!loading && paymentMessage && (
        <div className="mb-4 rounded bg-green-100 p-4 text-green-700">{paymentMessage}</div>
      )}

      {!loading && cart?.length === 0 && (
        <div className="h-screen">
          <div className="h-[100%] flex items-center justify-center flex-col">
            <h1 className="text-5xl lg:text-6xl font-semibold text-zinc-400">Empty Cart</h1>
          </div>
        </div>
      )}

      {!loading && cart?.length > 0 && (
        <>
          <h1 className="text-5xl font-semibold text-zinc-500 mb-8">Your Cart</h1>
          {cart.map((item) => {
            const book = item.book;
            const bookId = getBookId(item);
            const quantity = normalizeQuantity(item.quantity);
            const quantityPending = updatingBookId.endsWith(`-${bookId}`);

            return (
              <div className="w-full my-4 rounded flex flex-col md:flex-row gap-4 p-4 bg-zinc-800 justify-between items-center" key={bookId}>
                <img src={book.url} alt="/" className="h-[20vh] md:h-[10vh] object-cover" />
                <div className="w-full md:flex-1">
                  <h1 className="text-2xl text-zinc-100 font-semibold text-start mt-2 md:mt-0">{book.title}</h1>
                  <p className="text-normal text-zinc-300 mt-2 hidden lg:block">{book.desc?.slice(0, 100)}...</p>
                  <p className="text-normal text-zinc-300 mt-2 hidden md:block lg:hidden">{book.desc?.slice(0, 65)}...</p>
                  <p className="text-normal text-zinc-300 mt-2 block md:hidden">{book.desc?.slice(0, 100)}...</p>
                </div>
                <div className="flex flex-col sm:flex-row mt-4 md:mt-0 w-full md:w-auto items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-zinc-100 text-2xl font-semibold">Rs {formatAmount(book.price)}</h2>
                    <p className="text-zinc-400">Subtotal: Rs {formatAmount(getItemSubtotal(item))}</p>
                  </div>
                  <div className="flex items-center rounded border border-zinc-600 overflow-hidden">
                    <button
                      className="px-3 py-2 text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => updateQuantity(bookId, "decrement", quantity, book.stock)}
                      disabled={quantity <= 1 || quantityPending || paymentLoading}
                      aria-label={`Decrease quantity of ${book.title}`}
                    >
                      <FaMinus />
                    </button>
                    <span className="min-w-12 px-3 text-center text-zinc-100 font-bold">{quantity}</span>
                    <button
                      className="px-3 py-2 text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => updateQuantity(bookId, "increment", quantity, book.stock)}
                      disabled={(book.stock !== undefined && quantity >= book.stock) || quantityPending || paymentLoading}
                      aria-label={`Increase quantity of ${book.title}`}
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <button
                    className="bg-red-100 text-red-700 border border-red-700 rounded p-2"
                    onClick={() => deleteItem(bookId)}
                    disabled={deletingBookId === bookId || paymentLoading}
                    aria-label={`Remove ${book.title} from cart`}
                  >
                    <AiFillDelete />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {!loading && cart && cart.length > 0 && (
        <div className="mt-4 w-full flex items-center justify-end">
          <div className="p-6 bg-zinc-800 rounded-2xl border border-zinc-700/60 min-w-[320px] max-w-md w-full space-y-4">
            <h1 className="text-2xl text-zinc-100 font-bold border-b border-zinc-700 pb-3">Order Summary</h1>
            <div className="space-y-2.5 text-base text-zinc-300">
              <div className="flex items-center justify-between"><span>Items</span><span className="font-semibold text-white">{cart.length}</span></div>
              <div className="flex items-center justify-between"><span>Total Quantity</span><span className="font-semibold text-white">{totalQuantity}</span></div>
              <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-semibold text-white">₹{formatAmount(subtotal)}</span></div>
              <div className="flex items-center justify-between border-t border-zinc-700 pt-3 text-xl font-bold text-yellow-100"><span>Total Amount</span><span>₹{formatAmount(totalAmount)}</span></div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                to="/checkout"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-600/30 transition"
              >
                <span>Proceed to Checkout</span>
                <FaArrowRight className="text-sm" />
              </Link>
              
              <button
                className="bg-zinc-100 text-zinc-900 rounded-xl py-3 px-4 flex justify-center w-full font-bold hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition"
                onClick={payWithRazorpay}
                disabled={cart.length === 0 || paymentLoading}
              >
                {paymentButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
