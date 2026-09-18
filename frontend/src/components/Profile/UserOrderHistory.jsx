import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBan, FaCalendarAlt, FaMapMarkerAlt, FaCreditCard } from "react-icons/fa";
import api from '../../api/axios';
import Loader from '../Loader/Loader';
import { useToast } from '../../context/ToastContext';

const UserOrderHistory = () => {
  const [orderHistory, setOrderHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState("");
  const { showToast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get-order-history");
      setOrderHistory(response.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to fetch order history", "error");
      setOrderHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setCancelingId(orderId);
      const response = await api.put(`/cancel-order/${orderId}`);
      showToast(response.data.message || "Order canceled successfully", "success");
      await fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to cancel order", "error");
    } finally {
      setCancelingId("");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Order Placed":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Order Placed</span>;
      case "Processing":
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Processing</span>;
      case "Shipped":
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Shipped</span>;
      case "Out for delivery":
        return <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Out for Delivery</span>;
      case "Delivered":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Delivered</span>;
      case "Canceled":
      default:
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-xs font-semibold">Canceled</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch (status) {
      case "Paid":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-medium">Paid</span>;
      case "Failed":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-medium">Failed</span>;
      case "Pending":
      default:
        return <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-xs font-medium">Pending (COD)</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  if (!orderHistory || orderHistory.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-zinc-800/40 rounded-2xl border border-zinc-700/50 text-center space-y-4">
        <h2 className="text-3xl font-bold text-zinc-400">No Orders Yet</h2>
        <p className="text-zinc-500 max-w-sm">Looks like you haven't placed any orders yet. Discover our collection of books!</p>
        <Link
          to="/all-books"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30"
        >
          Browse Books
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-yellow-100">Your Order History</h1>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700">
          {orderHistory.length} orders
        </span>
      </div>

      <div className="space-y-4">
        {orderHistory.map((item, i) => {
          const book = item.book;
          const isCancellable = ["Order Placed", "Processing"].includes(item.status);

          return (
            <div
              key={item._id || i}
              className="bg-zinc-800 rounded-2xl border border-zinc-700/50 p-5 md:p-6 transition hover:border-zinc-600 shadow-md space-y-4"
            >
              {/* Order header row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-700/60 text-xs text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-zinc-300">Order #{item._id.slice(-8).toUpperCase()}</span>
                  <span className="flex items-center gap-1">
                    <FaCalendarAlt className="text-zinc-500" />
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <FaCreditCard className="text-zinc-500" />
                    {getPaymentBadge(item.paymentStatus)}
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Order content */}
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    {book?.url ? (
                      <img src={book.url} alt={book.title} className="max-h-full object-contain" />
                    ) : (
                      <div className="text-xs text-zinc-600">No Image</div>
                    )}
                  </div>
                  <div>
                    {book ? (
                      <Link
                        to={`/view-book-details/${book._id}`}
                        className="text-lg font-semibold text-white hover:text-blue-400 transition"
                      >
                        {book.title}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold text-zinc-400">Book Unavailable</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Qty: <span className="text-zinc-200 font-semibold">{item.quantity || 1}</span> × ₹{item.price || 0}
                    </p>
                  </div>
                </div>

                {/* Amount & Cancel button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-700/40">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-zinc-400">Total Amount</p>
                    <p className="text-2xl font-bold text-yellow-100">₹{item.totalAmount || (item.price * (item.quantity || 1))}</p>
                  </div>

                  {isCancellable && (
                    <button
                      onClick={() => handleCancelOrder(item._id)}
                      disabled={cancelingId === item._id}
                      className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <FaBan className="text-xs" />
                      <span>{cancelingId === item._id ? "Canceling..." : "Cancel Order"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Shipping Address footer */}
              {item.shippingAddress && (
                <div className="pt-2 text-xs text-zinc-400 flex items-start gap-1.5">
                  <FaMapMarkerAlt className="text-zinc-500 mt-0.5 flex-shrink-0" />
                  <span className="truncate">Shipping to: <strong className="text-zinc-300 font-normal">{item.shippingAddress}</strong></span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserOrderHistory;
