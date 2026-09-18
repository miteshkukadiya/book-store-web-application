import React, { useState } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

const AddBook = () => {
    const { showToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
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
            const response = await api.post("/add-book", {
                ...Data,
                price: Number(Data.price),
                stock: Number(Data.stock) || 0,
                lowStockThreshold: Number(Data.lowStockThreshold) || 5,
            });

            setData({
                url: "",
                title: "",
                author: "",
                price: "",
                desc: "",
                language: "",
                stock: "10",
                lowStockThreshold: "5",
            });
            showToast(response.data.message || "Book added successfully", "success");
        } catch (error) {
            showToast(error.response?.data?.message || "Unable to add book", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-[100%] p-0 md:p-4 text-zinc-100">
            <h1 className="text-3xl md:text-5xl font-semibold text-zinc-500 mb-8">
                Add Book
            </h1>
            <div className="p-6 bg-zinc-800 rounded-2xl border border-zinc-700/60 shadow-xl space-y-4">
                <div>
                    <label className="text-zinc-400 text-sm font-semibold">Image URL</label>
                    <input
                        type="text"
                        className="w-full mt-1.5 bg-zinc-900 text-zinc-100 p-3 rounded-xl border border-zinc-700 outline-none focus:border-blue-500 transition"
                        placeholder="https://example.com/cover.jpg"
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
                        placeholder="The Great Gatsby"
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
                        placeholder="F. Scott Fitzgerald"
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
                            placeholder="English"
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
                            placeholder="499"
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
                        <label className="text-zinc-400 text-sm font-semibold">Initial Stock</label>
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
                        <label className="text-zinc-400 text-sm font-semibold">Low Stock Alert Threshold</label>
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
                        placeholder="Write a brief overview of the book..."
                        name="desc"
                        required
                        value={Data.desc}
                        onChange={change}
                    />
                </div>

                <button
                    disabled={submitting}
                    className="mt-2 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                    onClick={submit}
                >
                    {submitting ? "Adding Book..." : "Add Book"}
                </button>
            </div>
        </div>
    );
};

export default AddBook;
