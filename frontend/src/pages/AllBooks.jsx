import React, { useEffect, useState } from 'react';
import { FaSearch, FaFilter, FaRedo, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import api from "../api/axios";
import Loader from '../components/Loader/Loader';
import BookCard from '../components/BookCard/BookCard';

const AllBooks = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [stock, setStock] = useState("all");
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        sort,
      };

      if (search.trim()) params.search = search.trim();
      if (language && language !== "all") params.language = language;
      if (stock && stock !== "all") params.stock = stock;
      if (minPrice !== "") params.minPrice = minPrice;
      if (maxPrice !== "") params.maxPrice = maxPrice;

      const response = await api.get("/get-all-books", { params });

      if (response.data.data) {
        setData(response.data.data);
        setTotalPages(response.data.totalPages || 1);
        setTotalBooks(response.data.totalBooks || response.data.data.length);
        if (response.data.availableLanguages?.length) {
          setAvailableLanguages(response.data.availableLanguages);
        }
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [page, sort, language, stock]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBooks();
  };

  const handleResetFilters = () => {
    setSearch("");
    setLanguage("all");
    setStock("all");
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);
  };

  return (
    <div className="bg-zinc-900 min-h-screen px-4 md:px-12 py-8 text-zinc-100 space-y-8">
      {/* Header & title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-100">All Books</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Showing {data.length} of {totalBooks} books available
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-semibold self-start"
        >
          <FaFilter /> {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className={`bg-zinc-800/80 p-5 rounded-2xl border border-zinc-700/60 shadow-lg space-y-4 ${showFilters ? "block" : "hidden md:block"}`}>
        {/* Top search & sort row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative flex items-center">
            <input
              type="text"
              placeholder="Search by title, author, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2.5 pl-10 pr-24 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
            />
            <FaSearch className="absolute left-3.5 text-zinc-500 text-sm" />
            <button
              type="submit"
              className="absolute right-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition"
            >
              Search
            </button>
          </form>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 font-semibold whitespace-nowrap">Sort By:</label>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="newest">Newest Additions</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating_high">Top Rated</option>
              <option value="title_asc">Title (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-zinc-700/60">
          {/* Language filter */}
          <div>
            <label className="block text-xs text-zinc-400 font-semibold mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          {/* Stock Availability */}
          <div>
            <label className="block text-xs text-zinc-400 font-semibold mb-1">Availability</label>
            <select
              value={stock}
              onChange={(e) => { setStock(e.target.value); setPage(1); }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">All Items</option>
              <option value="in_stock">In Stock Only</option>
              <option value="low_stock">Low Stock Only</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs text-zinc-400 font-semibold mb-1">Price Range (₹)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
              />
              <span className="text-zinc-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Apply & Reset */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => { setPage(1); fetchBooks(); }}
              className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition"
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilters}
              className="bg-zinc-900 hover:bg-zinc-700 text-zinc-400 hover:text-white p-2.5 rounded-xl border border-zinc-700 text-sm transition"
              title="Reset Filters"
            >
              <FaRedo />
            </button>
          </div>
        </div>
      </div>

      {/* Book Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader />
        </div>
      ) : data.length === 0 ? (
        <div className="min-h-[40vh] bg-zinc-800/40 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center p-8 text-center space-y-3">
          <p className="text-2xl font-bold text-zinc-400">No books found</p>
          <p className="text-zinc-500 text-sm max-w-md">
            No books matched your active search or filter criteria. Try adjusting your keywords or clearing the filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data.map((book) => (
            <BookCard key={book._id} data={book} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition border border-zinc-700/60"
            aria-label="Previous page"
          >
            <FaChevronLeft className="text-xs" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
                page === num
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700/60"
              }`}
            >
              {num}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition border border-zinc-700/60"
            aria-label="Next page"
          >
            <FaChevronRight className="text-xs" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AllBooks;
