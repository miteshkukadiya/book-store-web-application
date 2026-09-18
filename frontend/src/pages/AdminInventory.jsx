import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBoxes, FaSearch, FaSave, FaEdit } from "react-icons/fa";
import api from "../api/axios";
import Loader from "../components/Loader/Loader";
import { useToast } from "../context/ToastContext";

const AdminInventory = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stockEdits, setStockEdits] = useState({});
  const [savingId, setSavingId] = useState("");
  const { showToast } = useToast();

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/inventory", {
        params: { filter: filter !== "all" ? filter : undefined },
      });
      setBooks(response.data.data || []);

      // Initialize stock edit map
      const edits = {};
      (response.data.data || []).forEach((b) => {
        edits[b._id] = {
          stock: b.stock !== undefined ? b.stock : 10,
          lowStockThreshold: b.lowStockThreshold !== undefined ? b.lowStockThreshold : 5,
        };
      });
      setStockEdits(edits);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to fetch inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [filter]);

  const handleStockChange = (bookId, field, val) => {
    setStockEdits((prev) => ({
      ...prev,
      [bookId]: {
        ...prev[bookId],
        [field]: Number(val),
      },
    }));
  };

  const handleSaveStock = async (bookId) => {
    const edit = stockEdits[bookId];
    if (!edit || edit.stock < 0 || edit.lowStockThreshold < 0) {
      showToast("Stock and threshold must be positive numbers", "warning");
      return;
    }

    try {
      setSavingId(bookId);
      const response = await api.put("/admin/update-stock", {
        bookId,
        stock: edit.stock,
        lowStockThreshold: edit.lowStockThreshold,
      });
      showToast(response.data.message || "Stock updated successfully", "success");
      await fetchInventory();
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update stock", "error");
    } finally {
      setSavingId("");
    }
  };

  const filteredBooks = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-zinc-100 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">Inventory Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Monitor stock levels, set low-stock thresholds, and restock books</p>
        </div>
        <Link
          to="/profile/add-book"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition self-start md:self-auto"
        >
          + Add New Book
        </Link>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          <FaSearch className="absolute left-3 top-3 text-zinc-500 text-xs" />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
            }`}
          >
            All Inventory ({books.length})
          </button>
          <button
            onClick={() => setFilter("low_stock")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filter === "low_stock"
                ? "bg-amber-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
            }`}
          >
            Low Stock Only
          </button>
          <button
            onClick={() => setFilter("out_of_stock")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filter === "out_of_stock"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700"
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="min-h-[40vh] bg-zinc-800/40 rounded-2xl border border-zinc-700/50 flex flex-col items-center justify-center p-8 text-center space-y-2">
          <FaBoxes className="text-4xl text-zinc-600 mb-2" />
          <p className="text-xl font-bold text-zinc-400">No Books Found in Inventory</p>
          <p className="text-zinc-500 text-sm">Try changing the filter or search query.</p>
        </div>
      ) : (
        <div className="bg-zinc-800 rounded-2xl border border-zinc-700/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/90 text-xs uppercase text-zinc-400 border-b border-zinc-700/60">
                <tr>
                  <th className="p-4">Book</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Alert Threshold</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/40">
                {filteredBooks.map((b) => {
                  const currentEdit = stockEdits[b._id] || { stock: b.stock, lowStockThreshold: b.lowStockThreshold };
                  const isOut = b.stock <= 0;
                  const isLow = !isOut && b.stock <= b.lowStockThreshold;

                  return (
                    <tr key={b._id} className="hover:bg-zinc-900/40 transition">
                      {/* Book details */}
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={b.url}
                          alt=""
                          className="w-10 h-12 object-contain rounded bg-zinc-900 p-0.5"
                        />
                        <div>
                          <p className="font-bold text-white max-w-xs truncate">{b.title}</p>
                          <p className="text-xs text-zinc-400">by {b.author}</p>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="p-4 font-semibold text-yellow-100">₹{b.price}</td>

                      {/* Stock input */}
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          value={currentEdit.stock}
                          onChange={(e) => handleStockChange(b._id, "stock", e.target.value)}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg py-1 px-2.5 text-zinc-100 font-bold focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Threshold input */}
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          value={currentEdit.lowStockThreshold}
                          onChange={(e) => handleStockChange(b._id, "lowStockThreshold", e.target.value)}
                          className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg py-1 px-2.5 text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Status badge */}
                      <td className="p-4">
                        {isOut ? (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                            Low Stock
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSaveStock(b._id)}
                            disabled={savingId === b._id}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                            title="Save stock changes"
                          >
                            <FaSave className="text-xs" />
                            <span>{savingId === b._id ? "Saving..." : "Save"}</span>
                          </button>
                          <Link
                            to={`/UpdateBook/${b._id}`}
                            className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 p-2 rounded-lg text-xs transition"
                            title="Full Edit Book"
                          >
                            <FaEdit />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
