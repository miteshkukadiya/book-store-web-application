import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import RazorpayPaymentButton from "../components/Payment/RazorpayPaymentButton";
import api from "../api/axios";

const getHeaders = () => ({
  id: localStorage.getItem("id"),
  authorization: `Bearer ${localStorage.getItem("token")}`,
});

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

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const headers = getHeaders();
        const [cartResponse, userResponse] = await Promise.all([
          api.get("/get-user-cart", { headers }),
          api.get("/get-user-information", { headers }),
        ]);
        const books = normalizeCartItems(cartResponse.data.data);
        const user = userResponse.data;
        setCart(books);
        setUserInfo(user);
        setShippingAddress(user.address || "");
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || "Unable to load checkout");
        setCart([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, []);

  const subtotal = (cart || []).reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const totalQuantity = (cart || []).reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0);

  const handlePayment = async () => {
    const address = shippingAddress.trim();
    if (!address) {
      setError("Shipping address is required before payment");
      return;
    }

    try {
      setError("");
      await api.put("/update-address", { address }, { headers: getHeaders() });
      setShippingAddress(address);
    } catch (addressError) {
      setError(addressError.response?.data?.message || "Unable to save shipping address");
      throw addressError;
    }
  };

  const handleSuccess = () => {
    setMessage("Payment successful. Order created. Redirecting to order history...");
    setTimeout(() => navigate("/profile/orderHistory"), 1200);
  };

  const handleError = (paymentError) => {
    setError(paymentError);
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 min-h-screen flex items-center justify-center">
        <Loader />{" "}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 min-h-screen px-4 md:px-12 py-8 text-zinc-100">
      <h1 className="text-4xl md:text-5xl font-semibold text-zinc-500 mb-8">Checkout</h1>
      {error && <div className="mb-4 rounded bg-red-100 p-4 text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded bg-green-100 p-4 text-green-700">{message}</div>}

      {!cart?.length ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <h2 className="text-4xl font-semibold text-zinc-400">Empty Cart</h2>
          <button className="mt-6 rounded bg-zinc-100 px-4 py-2 font-semibold text-zinc-900" onClick={() => navigate("/cart")}>
            Return to Cart
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded bg-zinc-800 p-5">
              <h2 className="text-2xl font-semibold">Book List</h2>
              <div className="mt-4 space-y-4">
                {cart.map((item) => {
                  const book = item.book;
                  const quantity = normalizeQuantity(item.quantity);

                  return (
                    <div className="flex items-center gap-4 border-b border-zinc-700 pb-4 last:border-0 last:pb-0" key={getBookId(item)}>
                    <img src={book.url} alt="" className="h-20 w-14 object-cover" />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{book.title}</h3>
                      <p className="text-zinc-400">by {book.author}</p>
                      <p className="text-zinc-400">Qty {quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold">Rs {formatAmount(getItemSubtotal(item))}</p>
                      <p className="text-sm text-zinc-400">Rs {formatAmount(book.price)} each</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded bg-zinc-800 p-5">
              <h2 className="text-2xl font-semibold">Shipping Address</h2>
              <textarea
                className="mt-4 w-full rounded bg-zinc-900 p-3 text-zinc-100 outline-none"
                rows="4"
                value={shippingAddress}
                onChange={(event) => setShippingAddress(event.target.value)}
                placeholder="Enter your shipping address"
              />
            </section>
          </div>

          <aside className="h-fit rounded bg-zinc-800 p-5">
            <h2 className="text-2xl font-semibold">Order Summary</h2>
            <div className="mt-4 space-y-3 text-lg">
              <div className="flex justify-between"><span>Books</span><span>{cart.length}</span></div>
              <div className="flex justify-between"><span>Quantity</span><span>{totalQuantity}</span></div>
              <div className="flex justify-between"><span>Subtotal</span><span>Rs {formatAmount(subtotal)}</span></div>
              <div className="flex justify-between border-t border-zinc-700 pt-3 text-xl font-semibold"><span>Total amount</span><span>Rs {formatAmount(subtotal)}</span></div>
            </div>

            <div className="mt-6 border-t border-zinc-700 pt-5">
              <h2 className="text-2xl font-semibold">User Information</h2>
              <p className="mt-3 text-zinc-300">{userInfo?.username || "Logged-in user"}</p>
              <p className="text-zinc-400">{userInfo?.email || "Email unavailable"}</p>
            </div>

            <div className="mt-6 border-t border-zinc-700 pt-5">
              <h2 className="text-2xl font-semibold">Payment Method</h2>
              <p className="mt-2 mb-4 text-zinc-400">Secure payment through Razorpay</p>
              <RazorpayPaymentButton
                cartItems={cart.map((item) => ({ book: getBookId(item), quantity: item.quantity }))}
                userInfo={userInfo}
                onSuccess={handleSuccess}
                onError={handleError}
                onBeforePayment={handlePayment}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Checkout;
