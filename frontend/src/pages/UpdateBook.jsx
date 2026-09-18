import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader/Loader';

const UpdateBook = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [Data, setData] = useState({
        url: "",
        title: "",
        author: "",
        price: "",
        desc: "",
        language: "",
        stock: "10",
        lowStockThreshold: "5",
    });

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/get-book-by-id/${id}`);
                const book = response.data.data;
                setData({
                    url: book.url || "",
                    title: book.title || "",
                    author: book.author || "",
                    price: book.price || "",
                    desc: book.desc || "",
                    language: book.language || "",
                    stock: book.stock !== undefined ? String(book.stock) : "10",
                    lowStockThreshold: book.lowStockThreshold !== undefined ? String(book.lowStockThreshold) : "5",
                });
            } catch (err) {
                showToast("Unable to load book details", "error");
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const change = (e) => {
        const { name, value } = e.target;
        setData({ ...Data, [name]: value });
    };

    const submit = async () => {
        try {
            if (
                !Data.url.trim() ||
                !Data.title.trim() ||
                !Data.author.trim() ||
                !Data.price ||
                !Data.desc.trim() ||
                !Data.language.trim()
            ) {
                showToast("All fields are required", "warning");
                return;
            }

            setSubmitting(true);
            const response = await api.put("/update-book", {
                ...Data,
                price: Number(Data.price),
                stock: Number(Data.stock) || 0,
                lowStockThreshold: Number(Data.lowStockThreshold) || 5,
            }, {
                headers: { bookid: id }
            });

            showToast(response.data.message || "Book updated successfully", "success");
            navigate(`/view-book-details/${id}`);
        } catch (error) {
            showToast(error.response?.data?.message || "Unable to update book", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 min-h-screen p-4 md:p-12 text-zinc-100">
            <h1 className="text-3xl md:text-5xl font-semibold text-zinc-500 mb-8">
                Update Book
            </h1>
            <div className="p-6 bg-zinc-800 rounded-2xl border border-zinc-700/60 shadow-xl space-y-4 max-w-4xl">
                <div>
                    <label className="text-zinc-400 text-sm font-semibold">Image URL</label>
                    <input
                        type="text"
                        className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                        placeholder="url of image"
                        name="url"
                        required
                        value={Data.url}
                        onChange={change}
                    />
                </div>
                <div>
                    <label className="text-zinc-400 text-sm font-semibold">Title of book</label>
                    <input
                        type="text"
                        className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                        placeholder="title of book"
                        name="title"
                        required
                        value={Data.title}
                        onChange={change}
                    />
                </div>
                <div>
                    <label className="text-zinc-400 text-sm font-semibold">Author of book</label>
                    <input
                        type="text"
                        className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                        placeholder="author of book"
                        name="author"
                        required
                        value={Data.author}
                        onChange={change}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-zinc-400 text-sm font-semibold">Language</label>
                        <input
                            type="text"
                            className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                            placeholder="language of book"
                            name="language"
                            required
                            value={Data.language}
                            onChange={change}
                        />
                    </div>
                    <div>
                        <label className="text-zinc-400 text-sm font-semibold">Price (₹)</label>
                        <input
                            type="number"
                            className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                            placeholder="price of book"
                            name="price"
                            required
                            value={Data.price}
                            onChange={change}
                        />
                    </div>
                </div>

                {/* Stock and Low Stock Threshold */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-zinc-400 text-sm font-semibold">Stock Quantity</label>
                        <input
                            type="number"
                            min="0"
                            className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                            placeholder="10"
                            name="stock"
                            required
                            value={Data.stock}
                            onChange={change}
                        />
                    </div>
                    <div>
                        <label className="text-zinc-400 text-sm font-semibold">Low Stock Threshold</label>
                        <input
                            type="number"
                            min="0"
                            className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                            placeholder="5"
                            name="lowStockThreshold"
                            required
                            value={Data.lowStockThreshold}
                            onChange={change}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-zinc-400 text-sm font-semibold">Description of book</label>
                    <textarea
                        className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                        rows="4"
                        placeholder="description of book"
                        name="desc"
                        required
                        value={Data.desc}
                        onChange={change}
                    />
                </div>

                <div className="flex gap-4 pt-2">
                    <button
                        disabled={submitting}
                        className="px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                        onClick={submit}
                    >
                        {submitting ? "Updating Book..." : "Save Changes"}
                    </button>
                    <button
                        type="button"
                        className="px-6 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold py-3 rounded-xl transition-all"
                        onClick={() => navigate(`/view-book-details/${id}`)}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateBook;
