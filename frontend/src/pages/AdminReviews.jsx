import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaTrash, FaSearch, FaCommentDots } from "react-icons/fa";
import api from "../api/axios";
import Loader from "../components/Loader/Loader";
import { useToast } from "../context/ToastContext";

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const { showToast } = useToast();

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/get-all-reviews");
      setReviews(response.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch reviews", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      setDeletingId(reviewId);
      const response = await api.delete(`/delete-review/${reviewId}`);
      showToast(response.data.message || "Review deleted successfully", "info");
      await fetchReviews();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete review", "error");
    } finally {
      setDeletingId("");
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.book?.title?.toLowerCase().includes(q) ||
      r.user?.username?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-zinc-100 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">Review Moderation</h1>
          <p className="text-zinc-400 text-sm mt-1">Monitor and moderate customer ratings and comments across all books</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700/60 flex items-center justify-between">
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search by book, user, or review text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
          <FaSearch className="absolute left-3.5 top-3.5 text-zinc-500 text-xs" />
        </div>
        <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-700 px-3 py-2 rounded-xl hidden md:block">
          Total Reviews: {reviews.length}
        </span>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="min-h-[40vh] bg-zinc-800/40 rounded-2xl border border-zinc-700/50 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <FaCommentDots className="text-4xl text-zinc-600 mb-2" />
          <p className="text-xl font-bold text-zinc-400">No Reviews Found</p>
          <p className="text-zinc-500 text-sm">There are no customer reviews matching the search query.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/90 text-xs uppercase text-zinc-400 border-b border-zinc-700/60">
                <tr>
                  <th className="p-4">Book</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4">Review Comment</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/40">
                {filteredReviews.map((r) => (
                  <tr key={r._id} className="hover:bg-zinc-900/40 transition">
                    {/* Book */}
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={r.book?.url}
                        alt=""
                        className="w-8 h-10 object-contain rounded bg-zinc-900 p-0.5"
                      />
                      <div>
                        {r.book ? (
                          <Link
                            to={`/view-book-details/${r.book._id}`}
                            className="font-bold text-white hover:text-blue-400 transition truncate max-w-[160px] block"
                          >
                            {r.book.title}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">Deleted Book</span>
                        )}
                      </div>
                    </td>

                    {/* User */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={r.user?.avatar || "https://cdn-icons-png.flaticon.com/128/3177/3177440.png"}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-zinc-900 border border-zinc-700"
                        />
                        <div>
                          <p className="font-semibold text-white text-xs">{r.user?.username || "Anonymous"}</p>
                          <p className="text-[11px] text-zinc-500">{r.user?.email || ""}</p>
                        </div>
                      </div>
                    </td>

                    {/* Star Rating */}
                    <td className="p-4">
                      <div className="flex items-center text-yellow-400 text-xs gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FaStar key={s} className={s <= r.rating ? "text-yellow-400" : "text-zinc-600"} />
                        ))}
                        <span className="ml-1 font-bold text-zinc-300">({r.rating})</span>
                      </div>
                    </td>

                    {/* Comment */}
                    <td className="p-4 max-w-sm">
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{r.comment}</p>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Delete action */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteReview(r._id)}
                        disabled={deletingId === r._id}
                        className="bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 p-2 rounded-xl text-xs transition disabled:opacity-50"
                        title="Delete Review"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
