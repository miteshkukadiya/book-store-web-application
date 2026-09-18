import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { GrLanguage } from "react-icons/gr";
import { FaHeart, FaShoppingCart, FaEdit, FaStar, FaTrash, FaCheck } from "react-icons/fa";
import { MdOutlineDelete, MdInventory2 } from "react-icons/md";
import { useSelector } from 'react-redux';
import api from "../../api/axios";
import Loader from '../Loader/Loader';
import { useToast } from '../../context/ToastContext';

const ViewBookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const role = useSelector((state) => state.auth.role);
  const currentUserId = localStorage.getItem("id");

  const fetchBookDetails = async () => {
    try {
      const response = await api.get(`/get-book-by-id/${id}`);
      setData(response.data.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch book details", "error");
    }
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const res = await api.get(`/get-reviews/${id}`);
      setReviews(res.data.data || []);

      // Check if logged-in user already wrote a review
      if (currentUserId && res.data.data) {
        const myReview = res.data.data.find(
          (r) => r.user?._id === currentUserId || r.user === currentUserId
        );
        if (myReview) {
          setUserRating(myReview.rating);
          setUserComment(myReview.comment);
          setEditingReviewId(myReview._id);
        }
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
    fetchReviews();
  }, [id]);

  const handleFavourite = async () => {
    try {
      setActionLoading(true);
      const response = await api.put("/add-book-to-favourite", {}, {
        headers: { bookid: id }
      });
      showToast(response.data.message || "Added to favourites!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add to favourites", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCart = async () => {
    if (data?.stock <= 0) {
      showToast("This book is currently out of stock", "warning");
      return;
    }
    try {
      setActionLoading(true);
      const response = await api.put("/add-to-cart", { quantity: 1 }, {
        headers: { bookid: id }
      });
      showToast(response.data.message || "Book added to cart!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add to cart", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteBook = async () => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      const response = await api.delete("/delete-book", {
        headers: { bookid: id }
      });
      showToast(response.data.message || "Book deleted successfully", "success");
      navigate("/all-books");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete book", "error");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!userComment.trim()) {
      showToast("Please write a comment for your review", "warning");
      return;
    }

    try {
      setSubmittingReview(true);
      if (editingReviewId) {
        // Update existing review
        await api.put(`/update-review/${editingReviewId}`, {
          rating: userRating,
          comment: userComment.trim(),
        });
        showToast("Your review has been updated!", "success");
      } else {
        // Create new review
        await api.post(`/add-review/${id}`, {
          rating: userRating,
          comment: userComment.trim(),
        });
        showToast("Thank you for your review!", "success");
      }

      await fetchBookDetails();
      await fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to submit review", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/delete-review/${reviewId}`);
      showToast("Review deleted", "info");
      if (reviewId === editingReviewId) {
        setEditingReviewId(null);
        setUserComment("");
        setUserRating(5);
      }
      await fetchBookDetails();
      await fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete review", "error");
    }
  };

  if (!data) {
    return (
      <div className="h-screen bg-zinc-900 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const isOutOfStock = data.stock !== undefined && data.stock <= 0;
  const isLowStock = !isOutOfStock && data.stock !== undefined && data.lowStockThreshold !== undefined && data.stock <= data.lowStockThreshold;

  return (
    <div className="px-4 md:px-12 py-8 bg-zinc-900 min-h-screen text-zinc-100 space-y-12">
      {/* Book details section */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Book cover & quick actions */}
        <div className="w-full lg:w-2/5 flex flex-col items-center">
          <div className="bg-zinc-800 p-8 rounded-2xl w-full flex flex-col items-center border border-zinc-700/50 shadow-xl relative">
            {isOutOfStock && (
              <span className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                Out of Stock
              </span>
            )}
            {isLowStock && (
              <span className="absolute top-4 left-4 bg-amber-500 text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                Only {data.stock} Left in Stock
              </span>
            )}
            
            <img
              src={data.url}
              alt={data.title}
              className="max-h-[55vh] w-auto object-contain rounded-lg shadow-2xl"
            />

            {/* Action buttons */}
            <div className="mt-8 flex gap-4 w-full justify-center">
              {isLoggedIn && role === "user" && (
                <>
                  <button
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-red-400 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition disabled:opacity-50"
                    onClick={handleFavourite}
                    disabled={actionLoading}
                  >
                    <FaHeart className="text-xl" />
                    <span>Wishlist</span>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition ${
                      isOutOfStock
                        ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                    }`}
                    onClick={handleCart}
                    disabled={actionLoading || isOutOfStock}
                  >
                    <FaShoppingCart className="text-xl" />
                    <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                  </button>
                </>
              )}

              {isLoggedIn && role === "admin" && (
                <>
                  <Link
                    to={`/UpdateBook/${id}`}
                    className="flex-1 bg-zinc-100 hover:bg-white text-zinc-900 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition"
                  >
                    <FaEdit className="text-lg" />
                    <span>Edit</span>
                  </Link>
                  <button
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition shadow-lg shadow-red-600/30"
                    onClick={deleteBook}
                  >
                    <MdOutlineDelete className="text-xl" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Book details metadata */}
        <div className="w-full lg:w-3/5 space-y-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {data.title}
            </h1>
            <p className="text-lg text-zinc-400 mt-2 font-medium">by <span className="text-zinc-200">{data.author}</span></p>
          </div>

          {/* Rating overview */}
          <div className="flex items-center gap-4 py-3 border-y border-zinc-800">
            <div className="flex items-center gap-1 text-yellow-400 text-xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={
                    star <= Math.round(data.averageRating || 0)
                      ? "text-yellow-400"
                      : "text-zinc-600"
                  }
                />
              ))}
            </div>
            <span className="text-xl font-bold text-white">
              {data.averageRating ? data.averageRating.toFixed(1) : "0.0"}
            </span>
            <span className="text-zinc-400 text-sm">
              ({data.totalReviews || 0} customer reviews)
            </span>
          </div>

          {/* Price & Stock info */}
          <div className="bg-zinc-800/60 p-6 rounded-2xl border border-zinc-700/50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Price</p>
              <p className="text-4xl text-yellow-100 font-extrabold mt-1">₹{data.price}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-semibold">Availability</p>
              <div className="flex items-center gap-2 mt-1">
                <MdInventory2 className={data.stock > 0 ? "text-emerald-400 text-xl" : "text-red-400 text-xl"} />
                <span className={`text-lg font-bold ${data.stock > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.stock > 0 ? `${data.stock} Copies Available` : "Out of Stock"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-zinc-200">Description</h3>
            <p className="text-zinc-400 leading-relaxed whitespace-pre-line text-base">{data.desc}</p>
          </div>

          <div className="flex items-center gap-3 text-zinc-400 pt-4 border-t border-zinc-800">
            <GrLanguage className="text-xl text-blue-400" />
            <span className="font-medium">Language: <strong className="text-zinc-200">{data.language}</strong></span>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="pt-8 border-t border-zinc-800 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white">Customer Reviews</h2>
          <span className="text-sm bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            {reviews.length} total
          </span>
        </div>

        {/* Review Submission Form */}
        {isLoggedIn && role === "user" ? (
          <form
            onSubmit={handleSubmitReview}
            className="bg-zinc-800/80 p-6 md:p-8 rounded-2xl border border-zinc-700/60 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xl font-semibold text-white">
                {editingReviewId ? "Edit Your Review" : "Write a Review"}
              </h3>
              {editingReviewId && (
                <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-1 rounded border border-amber-400/30">
                  Editing previous review
                </span>
              )}
            </div>

            {/* Interactive star selector */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Your Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    onClick={() => setUserRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <FaStar
                      className={
                        star <= (hoverRating || userRating)
                          ? "text-yellow-400"
                          : "text-zinc-600"
                      }
                    />
                  </button>
                ))}
                <span className="text-sm font-semibold text-zinc-400 ml-2">
                  {userRating} / 5 stars
                </span>
              </div>
            </div>

            {/* Comment input */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">Your Review</label>
              <textarea
                rows="3"
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="What did you like or dislike about this book?"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              {editingReviewId && (
                <button
                  type="button"
                  onClick={() => handleDeleteReview(editingReviewId)}
                  className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                >
                  <FaTrash className="text-xs" /> Delete Review
                </button>
              )}
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-md shadow-blue-600/30 disabled:opacity-50"
              >
                <FaCheck /> {submittingReview ? "Submitting..." : editingReviewId ? "Update Review" : "Submit Review"}
              </button>
            </div>
          </form>
        ) : !isLoggedIn ? (
          <div className="bg-zinc-800/40 p-6 rounded-xl border border-zinc-700/40 text-center space-y-2">
            <p className="text-zinc-400">Want to share your thoughts on this book?</p>
            <Link to="/LogIn" className="inline-block bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-500 transition">
              Log in to write a review
            </Link>
          </div>
        ) : null}

        {/* Existing reviews list */}
        <div className="space-y-4">
          {loadingReviews ? (
            <div className="py-8 flex justify-center"><Loader /></div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-lg">No reviews yet for this book.</p>
              <p className="text-sm mt-1">Be the first to share your review!</p>
            </div>
          ) : (
            reviews.map((rev) => {
              const isMyReview = currentUserId && (rev.user?._id === currentUserId || rev.user === currentUserId);
              const canDelete = isMyReview || role === "admin";

              return (
                <div
                  key={rev._id}
                  className="bg-zinc-800/70 p-5 rounded-xl border border-zinc-700/40 flex flex-col gap-3 transition hover:border-zinc-600/60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.user?.avatar || "https://cdn-icons-png.flaticon.com/128/3177/3177440.png"}
                        alt={rev.user?.username || "User"}
                        className="w-10 h-10 rounded-full bg-zinc-700 object-cover"
                      />
                      <div>
                        <p className="font-semibold text-white text-sm">
                          {rev.user?.username || "Anonymous Reader"}
                          {isMyReview && <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-normal">You</span>}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center text-yellow-400 text-sm">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FaStar
                            key={s}
                            className={s <= rev.rating ? "text-yellow-400" : "text-zinc-600"}
                          />
                        ))}
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteReview(rev._id)}
                          className="text-zinc-500 hover:text-red-400 p-1.5 rounded transition"
                          title="Delete review"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line pl-1">
                    {rev.comment}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewBookDetails;
