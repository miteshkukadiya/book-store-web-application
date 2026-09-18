import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaUsers,
  FaShoppingBag,
  FaRupeeSign,
  FaExclamationTriangle,
  FaArrowRight,
  FaCheckCircle,
  FaClock,
  FaTruck,
  FaBan,
  FaStar,
} from "react-icons/fa";
import api from "../api/axios";
import Loader from "../components/Loader/Loader";
import { useToast } from "../context/ToastContext";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/dashboard-stats");
      setStats(response.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch dashboard statistics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>No dashboard data available.</p>
      </div>
    );
  }

  const {
    totalBooks = 0,
    totalUsers = 0,
    totalOrders = 0,
    totalRevenue = 0,
    ordersByStatus = {},
    ordersByPaymentStatus = {},
    lowStockCount = 0,
    outOfStockCount = 0,
    lowStockBooks = [],
    recentOrders = [],
    topSellingBooks = [],
  } = stats;

  return (
    <div className="space-y-8 text-zinc-100 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">Admin Overview</h1>
          <p className="text-zinc-400 text-sm mt-1">Live store performance metrics and analytics</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/profile/inventory"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Manage Inventory
          </Link>
          <Link
            to="/profile/add-book"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-md shadow-blue-600/30"
          >
            + Add New Book
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="bg-zinc-800/90 rounded-2xl border border-zinc-700/60 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">₹{totalRevenue.toLocaleString()}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
              <FaRupeeSign />
            </div>
          </div>
          <p className="text-xs text-emerald-400 mt-3 font-medium flex items-center gap-1">
            <FaCheckCircle /> Paid Orders: {ordersByPaymentStatus["Paid"] || 0}
          </p>
        </div>

        {/* Orders */}
        <div className="bg-zinc-800/90 rounded-2xl border border-zinc-700/60 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Orders</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{totalOrders}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl">
              <FaShoppingBag />
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Delivered: <strong className="text-zinc-200">{ordersByStatus["Delivered"] || 0}</strong>
          </p>
        </div>

        {/* Books */}
        <div className="bg-zinc-800/90 rounded-2xl border border-zinc-700/60 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Books</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{totalBooks}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-2xl">
              <FaBook />
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            {outOfStockCount > 0 ? (
              <span className="text-red-400 font-semibold">{outOfStockCount} Out of Stock</span>
            ) : (
              <span className="text-emerald-400">All in stock</span>
            )}
          </p>
        </div>

        {/* Customers */}
        <div className="bg-zinc-800/90 rounded-2xl border border-zinc-700/60 p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Customers</p>
              <h2 className="text-3xl font-extrabold text-white mt-1">{totalUsers}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl">
              <FaUsers />
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">Registered buyers</p>
        </div>
      </div>

      {/* Order Status Breakdown Cards */}
      <div className="bg-zinc-800/60 rounded-2xl border border-zinc-700/50 p-5 space-y-3">
        <h3 className="text-lg font-bold text-white">Order Status Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-blue-500/30 text-center">
            <FaClock className="text-blue-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Placed</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">{ordersByStatus["Order Placed"] || 0}</p>
          </div>
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-yellow-500/30 text-center">
            <FaClock className="text-yellow-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Processing</p>
            <p className="text-xl font-bold text-yellow-400 mt-0.5">{ordersByStatus["Processing"] || 0}</p>
          </div>
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-purple-500/30 text-center">
            <FaTruck className="text-purple-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Shipped</p>
            <p className="text-xl font-bold text-purple-400 mt-0.5">{ordersByStatus["Shipped"] || 0}</p>
          </div>
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-cyan-500/30 text-center">
            <FaTruck className="text-cyan-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Out for Delivery</p>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">{ordersByStatus["Out for delivery"] || 0}</p>
          </div>
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-emerald-500/30 text-center">
            <FaCheckCircle className="text-emerald-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Delivered</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">{ordersByStatus["Delivered"] || 0}</p>
          </div>
          <div className="bg-zinc-900/80 p-3.5 rounded-xl border border-red-500/30 text-center">
            <FaBan className="text-red-400 mx-auto text-lg mb-1" />
            <p className="text-xs text-zinc-400">Canceled</p>
            <p className="text-xl font-bold text-red-400 mt-0.5">{ordersByStatus["Canceled"] || 0}</p>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Low Stock Alert & Top Selling Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert Panel */}
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <FaExclamationTriangle className="text-xl" />
              <h3 className="text-lg font-bold text-white">Inventory Stock Alerts</h3>
            </div>
            <Link
              to="/profile/inventory"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Manage all <FaArrowRight className="text-[10px]" />
            </Link>
          </div>

          {lowStockBooks.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              <FaCheckCircle className="text-emerald-400 text-3xl mx-auto mb-2" />
              <p>All books have healthy stock levels.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {lowStockBooks.map((b) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/70 border border-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <img src={b.url} alt="" className="w-8 h-10 object-contain rounded bg-zinc-800" />
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[200px]">{b.title}</p>
                      <p className="text-xs text-zinc-400">Threshold: {b.lowStockThreshold}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        b.stock <= 0
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {b.stock <= 0 ? "Out of Stock" : `${b.stock} Left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Books */}
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-yellow-400">
              <FaStar className="text-xl" />
              <h3 className="text-lg font-bold text-white">Top Selling Books</h3>
            </div>
          </div>

          {topSellingBooks.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              <p>No sales history yet to determine top sellers.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {topSellingBooks.map((b, idx) => (
                <div
                  key={b._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/70 border border-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold">
                      #{idx + 1}
                    </span>
                    <img src={b.url} alt="" className="w-8 h-10 object-contain rounded bg-zinc-800" />
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[180px]">{b.title}</p>
                      <p className="text-xs text-zinc-400">₹{b.price} &bull; Stock: {b.stock}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{b.totalSold} sold</p>
                    <p className="text-xs text-zinc-400">₹{b.totalRevenue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Orders</h3>
          <Link
            to="/profile/all-orders"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View all orders <FaArrowRight className="text-[10px]" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <p>No recent orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="p-3 rounded-l-xl">Book</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 rounded-r-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {recentOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-3 flex items-center gap-2 font-medium text-white">
                      <img src={ord.book?.url} alt="" className="w-7 h-9 object-contain rounded bg-zinc-800" />
                      <span className="truncate max-w-[180px]">{ord.book?.title || "Deleted Book"}</span>
                    </td>
                    <td className="p-3 text-zinc-300">{ord.user?.username || "Guest"}</td>
                    <td className="p-3 font-bold text-yellow-100">₹{ord.totalAmount}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          ord.paymentStatus === "Paid"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-semibold text-zinc-300">{ord.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
