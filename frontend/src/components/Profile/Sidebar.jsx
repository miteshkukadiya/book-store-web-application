import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaArrowRightFromBracket, FaHeart, FaClockRotateLeft, FaGear, FaChartPie, FaBoxesStacked, FaListCheck, FaSquarePlus, FaUsersGear, FaComments } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { authActions } from "../../store/auth";

const Sidebar = ({ data }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useSelector((state) => state.auth.role);

  const isActive = (path) => {
    if (path === "/profile" && (location.pathname === "/profile" || location.pathname === "/profile/")) return true;
    return location.pathname === path;
  };

  const navLinkClass = (path) => `
    w-full py-2.5 px-4 text-left rounded-xl font-semibold text-sm flex items-center gap-3 transition-all
    ${isActive(path)
      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"}
  `;

  return (
    <div className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700/60 flex flex-col justify-between h-auto lg:h-[100%] shadow-xl">
      <div className="flex flex-col items-center">
        <img
          src={data?.avatar || "https://cdn-icons-png.flaticon.com/128/3177/3177440.png"}
          alt="Avatar"
          className="h-20 w-20 rounded-full object-cover border-2 border-zinc-600 shadow-md bg-zinc-900"
        />
        <p className="mt-3 text-lg text-zinc-100 font-bold">
          {data?.username}
        </p>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">{data?.email}</p>
        <span className={`mt-2 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
          role === "admin" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-zinc-700 text-zinc-300"
        }`}>
          {role}
        </span>
        <div className="w-full mt-5 h-[1px] bg-zinc-700/60 hidden lg:block"></div>
      </div>

      {/* User Navigation Links */}
      {role === "user" && (
        <div className="w-full flex-col gap-1.5 hidden lg:flex my-4">
          <Link to="/profile" className={navLinkClass("/profile")}>
            <FaHeart className="text-red-400" />
            <span>Wishlist / Favourites</span>
          </Link>
          <Link to="/profile/orderHistory" className={navLinkClass("/profile/orderHistory")}>
            <FaClockRotateLeft className="text-blue-400" />
            <span>Order History</span>
          </Link>
          <Link to="/profile/settings" className={navLinkClass("/profile/settings")}>
            <FaGear className="text-zinc-400" />
            <span>Account Settings</span>
          </Link>
        </div>
      )}

      {/* Admin Navigation Links */}
      {role === "admin" && (
        <div className="w-full flex-col gap-1.5 hidden lg:flex my-4">
          <Link to="/profile" className={navLinkClass("/profile")}>
            <FaChartPie className="text-yellow-400" />
            <span>Dashboard Overview</span>
          </Link>
          <Link to="/profile/all-orders" className={navLinkClass("/profile/all-orders")}>
            <FaListCheck className="text-blue-400" />
            <span>Order Management</span>
          </Link>
          <Link to="/profile/inventory" className={navLinkClass("/profile/inventory")}>
            <FaBoxesStacked className="text-amber-400" />
            <span>Inventory & Stock</span>
          </Link>
          <Link to="/profile/add-book" className={navLinkClass("/profile/add-book")}>
            <FaSquarePlus className="text-emerald-400" />
            <span>Add New Book</span>
          </Link>
          <Link to="/profile/users" className={navLinkClass("/profile/users")}>
            <FaUsersGear className="text-purple-400" />
            <span>User Management</span>
          </Link>
          <Link to="/profile/reviews" className={navLinkClass("/profile/reviews")}>
            <FaComments className="text-cyan-400" />
            <span>Review Moderation</span>
          </Link>
        </div>
      )}

      {/* Logout button */}
      <button
        className="bg-zinc-900 hover:bg-red-950/60 hover:text-red-300 border border-zinc-700 hover:border-red-500/40 w-full py-2.5 rounded-xl text-zinc-300 text-sm font-semibold flex items-center justify-center gap-2 transition duration-200 mt-4 lg:mt-0"
        onClick={() => {
          dispatch(authActions.logout());
          dispatch(authActions.changeRole("user"));
          localStorage.removeItem("id");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/");
        }}
      >
        <span>Log Out</span>
        <FaArrowRightFromBracket className="text-xs" />
      </button>
    </div>
  );
};

export default Sidebar;
