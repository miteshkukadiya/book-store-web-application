import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeartBroken } from "react-icons/fa";
import api from '../../api/axios';
import BookCard from '../BookCard/BookCard';
import Loader from '../Loader/Loader';

const Favourites = () => {
  const [favouriteBooks, setFavouriteBooks] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    try {
      setLoading(true);
      const response = await api.get("/get-favourite-books");
      setFavouriteBooks(response.data.data || []);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      setFavouriteBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, []);

  const handleRemoveFavourite = (bookId) => {
    setFavouriteBooks((prev) => (prev || []).filter((b) => b._id !== bookId));
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!favouriteBooks || favouriteBooks.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-zinc-800/40 rounded-2xl border border-zinc-700/50 text-center space-y-4">
        <FaHeartBroken className="text-5xl text-zinc-600 mb-2" />
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-400">Your Wishlist is Empty</h2>
        <p className="text-zinc-500 max-w-sm text-sm">Save your favorite books to read or purchase later by clicking the heart icon on any book.</p>
        <Link
          to="/all-books"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/30"
        >
          Browse All Books
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-yellow-100">Your Wishlist</h1>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700">
          {favouriteBooks.length} saved
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favouriteBooks.map((item) => (
          <BookCard
            key={item._id}
            data={item}
            favourite={true}
            onRemoveFavourite={handleRemoveFavourite}
          />
        ))}
      </div>
    </div>
  );
};

export default Favourites;
