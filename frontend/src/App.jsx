import React, { useEffect } from 'react';
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { authActions } from './store/auth';

import Home from './pages/Home';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import AllBooks from './pages/AllBooks';
import SignUp from './pages/SignUp';
import LogIn from './pages/Login';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import ViewBookDetails from './components/ViewBookDetails/ViewBookDetails';

import Favourites from './components/Profile/Favourites';
import UserOrderHistory from './components/Profile/UserOrderHistory';
import Settings from './components/Profile/Settings';

import AdminDashboard from './pages/AdminDashboard';
import AllOrders from './pages/AllOrders';
import AdminInventory from './pages/AdminInventory';
import AddBook from './pages/AddBook';
import UpdateBook from './pages/UpdateBook';
import AdminUsers from './pages/AdminUsers';
import AdminReviews from './pages/AdminReviews';

const App = () => {
  const dispatch = useDispatch();
  const role = useSelector((state) => state.auth.role);

  useEffect(() => {
    if (
      localStorage.getItem("id") &&
      localStorage.getItem("token") &&
      localStorage.getItem("role")
    ) {
      dispatch(authActions.login());
      dispatch(authActions.changeRole(localStorage.getItem("role")));
    }
  }, [dispatch]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900 text-zinc-100 font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route path="/all-books" element={<AllBooks />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Profile & Subroutes */}
          <Route path="/profile" element={<Profile />}>
            {role === "admin" ? (
              <Route index element={<AdminDashboard />} />
            ) : (
              <Route index element={<Favourites />} />
            )}

            {/* Admin-only routes */}
            {role === "admin" && (
              <>
                <Route path="/profile/all-orders" element={<AllOrders />} />
                <Route path="/profile/inventory" element={<AdminInventory />} />
                <Route path="/profile/add-book" element={<AddBook />} />
                <Route path="/profile/users" element={<AdminUsers />} />
                <Route path="/profile/reviews" element={<AdminReviews />} />
              </>
            )}

            {/* User & Common routes */}
            <Route path="/profile/orderHistory" element={<UserOrderHistory />} />
            <Route path="/profile/settings" element={<Settings />} />
          </Route>

          <Route path="/SignUp" element={<SignUp />} />
          <Route path="/LogIn" element={<LogIn />} />
          <Route path="/UpdateBook/:id" element={<UpdateBook />} />
          <Route path="/view-book-details/:id" element={<ViewBookDetails />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
