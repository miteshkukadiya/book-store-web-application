import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const MobileNav = () => {
  const role = useSelector((state) => state.auth.role);
  const location = useLocation();

  const getLinkClass = (path) => `
    px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition
    ${location.pathname === path
      ? "bg-blue-600 text-white"
      : "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"}
  `;

  return (
    <div className="w-full flex lg:hidden items-center gap-2 overflow-x-auto my-3 pb-2">
      {role === "user" && (
        <>
          <Link to="/profile" className={getLinkClass("/profile")}>
            Wishlist
          </Link>
          <Link to="/profile/orderHistory" className={getLinkClass("/profile/orderHistory")}>
            Orders
          </Link>
          <Link to="/profile/settings" className={getLinkClass("/profile/settings")}>
            Settings
          </Link>
        </>
      )}
      {role === "admin" && (
        <>
          <Link to="/profile" className={getLinkClass("/profile")}>
            Dashboard
          </Link>
          <Link to="/profile/all-orders" className={getLinkClass("/profile/all-orders")}>
            Orders
          </Link>
          <Link to="/profile/inventory" className={getLinkClass("/profile/inventory")}>
            Inventory
          </Link>
          <Link to="/profile/add-book" className={getLinkClass("/profile/add-book")}>
            Add Book
          </Link>
          <Link to="/profile/users" className={getLinkClass("/profile/users")}>
            Users
          </Link>
          <Link to="/profile/reviews" className={getLinkClass("/profile/reviews")}>
            Reviews
          </Link>
        </>
      )}
    </div>
  );
};

export default MobileNav;
