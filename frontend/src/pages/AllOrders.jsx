import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaCheck, FaFilter, FaCalendarAlt, FaMapMarkerAlt, FaCreditCard } from "react-icons/fa";
import { IoOpenOutline } from "react-icons/io5";
import api from '../api/axios';
import Loader from '../components/Loader/Loader';
import SeeUserData from './SeeUserData';
import { useToast } from '../context/ToastContext';

const ALL_STATUSES = [
  "Order Placed",
  "Processing",
  "Shipped",
  "Out for delivery",
  "Delivered",
  "Canceled"
];

const AllOrders = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [userDiv, setUserDiv] = useState("hidden");
  const [userDivData, setUserDivData] = useState(null);
  const [updatingId, setUpdatingId] = useState("");
  const { showToast } = useToast();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== "All" ? { status: filterStatus } : {};
      const response = await api.get("/get-all-orders", { params });
      setAllOrders(response.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch orders", "error");
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const submitStatusChange = async (orderId) => {
    if (!selectedStatus) return;
    try {
      setUpdatingId(orderId);
      const response = await api.put(`/update-status/${orderId}`, { status: selectedStatus });
      showToast(response.data.message || "Status updated successfully", "success");
      setEditingOrderId(null);
      await fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    } finally {
      setUpdatingId("");
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

  return (
    <div className="space-y-6 text-zinc-100 p-2 md:p-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">All Orders Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage customer orders and dispatch statuses</p>
        </div>

        {/* Status filter dropdown */}
        <div className="flex items-center gap-2">
          <FaFilter className="text-zinc-500 text-sm" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="All">All Statuses ({allOrders.length})</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader />
        </div>
      ) : allOrders.length === 0 ? (
        <div className="min-h-[40vh] bg-zinc-800/40 rounded-2xl border border-zinc-700/50 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <p className="text-2xl font-bold text-zinc-400">No Orders Found</p>
          <p className="text-zinc-500 text-sm">There are no orders matching the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allOrders.map((item, i) => {
            const book = item.book;
            const user = item.user;
            const isEditing = editingOrderId === item._id;

            return (
              <div
                key={item._id || i}
                className="bg-zinc-800 rounded-2xl border border-zinc-700/50 p-5 transition hover:border-zinc-600 shadow-md space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-700/60 text-xs text-zinc-400">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-zinc-200">#{i + 1} &bull; Order #{item._id.slice(-8).toUpperCase()}</span>
                    <span className="flex items-center gap-1">
                      <FaCalendarAlt className="text-zinc-500" />
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      item.paymentStatus === "Paid"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-zinc-700 text-zinc-300"
                    }`}>
                      {item.paymentStatus || "Pending"}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Content row */}
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                  {/* Book info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-16 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
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
                          className="text-base font-semibold text-white hover:text-blue-400 transition"
                        >
                          {book.title}
                        </Link>
                      ) : (
                        <p className="text-base font-semibold text-zinc-400">Deleted Book</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Qty: <strong className="text-zinc-200">{item.quantity || 1}</strong> &bull; Unit Price: ₹{item.price || 0}
                      </p>
                    </div>
                  </div>

                  {/* Customer info & modal opener */}
                  <div className="flex items-center gap-3 bg-zinc-900/60 px-4 py-2 rounded-xl border border-zinc-700/40">
                    <FaUser className="text-zinc-500 text-sm" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">{user?.username || "Guest User"}</p>
                      <p className="text-xs text-zinc-500">{user?.email || "No email"}</p>
                    </div>
                    {user && (
                      <button
                        onClick={() => {
                          setUserDiv("fixed");
                          setUserDivData(user);
                        }}
                        className="ml-2 text-zinc-400 hover:text-blue-400 p-1 transition"
                        title="View user details"
                      >
                        <IoOpenOutline className="text-lg" />
                      </button>
                    )}
                  </div>

                  {/* Amount & Status Editor */}
                  <div className="flex items-center justify-between w-full lg:w-auto gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-700/40">
                    <div className="text-left lg:text-right">
                      <p className="text-xs text-zinc-400">Total</p>
                      <p className="text-xl font-bold text-yellow-100">₹{item.totalAmount || (item.price * (item.quantity || 1))}</p>
                    </div>

                    {/* Status updater */}
                    <div className="relative">
                      {isEditing ? (
                        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-blue-500">
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-zinc-900 text-white text-xs font-semibold py-1 px-2 rounded-lg focus:outline-none"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => submitStatusChange(item._id)}
                            disabled={updatingId === item._id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg text-xs transition disabled:opacity-50"
                            title="Confirm"
                          >
                            <FaCheck />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingOrderId(item._id);
                            setSelectedStatus(item.status);
                          }}
                          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-semibold py-1.5 px-3 rounded-xl border border-zinc-600 transition"
                        >
                          Change Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Shipping address info */}
                {item.shippingAddress && (
                  <div className="pt-2 text-xs text-zinc-400 flex items-start gap-1.5 border-t border-zinc-700/40">
                    <FaMapMarkerAlt className="text-zinc-500 mt-0.5 flex-shrink-0" />
                    <span>Shipping Address: <strong className="text-zinc-300 font-normal">{item.shippingAddress}</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {userDivData && (
        <SeeUserData
          userDivData={userDivData}
          userDiv={userDiv}
          setuserDiv={setUserDiv}
        />
      )}
    </div>
  );
};

export default AllOrders;
