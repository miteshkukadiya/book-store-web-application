import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { FaStar, FaShoppingCart } from "react-icons/fa";
import api from "../../api/axios";
import { useToast } from '../../context/ToastContext';

const BookCard = ({ data, favourite, onRemoveFavourite }) => {
  const { showToast } = useToast();
  const [loadingAction, setLoadingAction] = useState(false);

  const isOutOfStock = data.stock !== undefined && data.stock <= 0;
  const isLowStock = !isOutOfStock && data.stock !== undefined && data.lowStockThreshold !== undefined && data.stock <= data.lowStockThreshold;

  const handleRemoveBook = async () => {
    try {
      setLoadingAction(true);
      const response = await api.put("/remove-book-from-favourite", {}, {
        headers: { bookid: data._id }
      });
      showToast(response.data.message || "Removed from favourites", "info");
      if (onRemoveFavourite) {
        onRemoveFavourite(data._id);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to remove from favourites", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMoveToCart = async () => {
    if (isOutOfStock) {
      showToast("Sorry, this book is currently out of stock", "warning");
      return;
    }
    try {
      setLoadingAction(true);
      const cartResponse = await api.put("/add-to-cart", { quantity: 1 }, {
        headers: { bookid: data._id }
      });
      showToast(cartResponse.data.message || "Added to cart!", "success");

      if (favourite) {
        await api.put("/remove-book-from-favourite", {}, {
          headers: { bookid: data._id }
        });
        if (onRemoveFavourite) {
          onRemoveFavourite(data._id);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to move to cart", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="bg-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:bg-zinc-750 transition-all duration-300 border border-zinc-700/50 hover:border-zinc-500/50 group h-full relative">
      {/* Stock Badges */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-1">
        {isOutOfStock && (
          <span className="bg-red-500/90 text-white text-xs font-bold px-2.5 py-1 rounded shadow-md backdrop-blur-sm">
            Out of Stock
          </span>
        )}
        {isLowStock && (
          <span className="bg-amber-500/90 text-black text-xs font-bold px-2.5 py-1 rounded shadow-md backdrop-blur-sm">
            Only {data.stock} left
          </span>
        )}
      </div>

      <Link to={`/view-book-details/${data._id}`} className="flex flex-col flex-1">
        <div className="bg-zinc-900 rounded-lg flex items-center justify-center p-4 overflow-hidden h-[220px]">
          <img
            src={data.url}
            alt={data.title}
            className="h-full max-h-[190px] w-auto object-contain rounded transform group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        <div className="mt-4 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-lg text-white font-semibold line-clamp-1 group-hover:text-blue-400 transition-colors">
              {data.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400 font-medium line-clamp-1">by {data.author}</p>
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-700/60">
            <p className="text-xl text-yellow-100 font-bold">₹{data.price}</p>
            {data.averageRating > 0 ? (
              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded text-xs text-yellow-400">
                <FaStar className="text-yellow-400" />
                <span className="font-bold">{data.averageRating.toFixed(1)}</span>
                {data.totalReviews > 0 && (
                  <span className="text-zinc-500">({data.totalReviews})</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-zinc-500">{data.language}</span>
            )}
          </div>
        </div>
      </Link>

      {favourite && (
        <div className="mt-4 pt-3 border-t border-zinc-700 flex flex-col gap-2">
          <button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-3 rounded flex items-center justify-center gap-2 transition disabled:opacity-50"
            onClick={handleMoveToCart}
            disabled={loadingAction || isOutOfStock}
          >
            <FaShoppingCart /> {isOutOfStock ? "Out of Stock" : "Move to Cart"}
          </button>
          <button
            className="w-full bg-zinc-900 hover:bg-red-950/60 text-red-400 border border-red-500/30 text-xs font-semibold py-1.5 px-3 rounded transition"
            onClick={handleRemoveBook}
            disabled={loadingAction}
          >
            Remove from favourite
          </button>
        </div>
      )}
    </div>
  );
};

export default BookCard;
