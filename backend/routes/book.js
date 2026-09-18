const router = require("express").Router();
const mongoose = require("mongoose");
const Book = require("../models/book");
const { authenticateToken, isAdmin } = require("./userAuth");

const requiredFields = ["url", "title", "author", "price", "desc", "language"];

const validateBookPayload = (payload = {}) => {
    payload = payload || {};
    if (requiredFields.some((field) => typeof payload[field] !== "string" ? payload[field] == null : !payload[field].trim())) {
        return "All book fields are required";
    }

    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
        return "Price must be a positive number";
    }

    if (payload.stock !== undefined) {
        const stock = Number(payload.stock);
        if (!Number.isFinite(stock) || stock < 0) {
            return "Stock must be a non-negative number";
        }
    }

    if (payload.lowStockThreshold !== undefined) {
        const threshold = Number(payload.lowStockThreshold);
        if (!Number.isFinite(threshold) || threshold < 0) {
            return "Low stock threshold must be a non-negative number";
        }
    }

    return null;
};

const getBookId = (req) => req.headers.bookid || req.body.bookid || req.params.id;

const validateBookId = (bookid, res) => {
    if (!bookid || !mongoose.isValidObjectId(bookid)) {
        res.status(400).json({ message: "Invalid book id" });
        return false;
    }

    return true;
};

// Add book --admin
router.post("/add-book", authenticateToken, isAdmin, async (req, res) => {
    const validationError = validateBookPayload(req.body);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const book = new Book({
            url: req.body.url.trim(),
            title: req.body.title.trim(),
            author: req.body.author.trim(),
            price: Number(req.body.price),
            desc: req.body.desc.trim(),
            language: req.body.language.trim(),
            stock: req.body.stock !== undefined ? Math.max(0, Number(req.body.stock)) : 10,
            lowStockThreshold: req.body.lowStockThreshold !== undefined ? Math.max(0, Number(req.body.lowStockThreshold)) : 5,
        });
        await book.save();
        return res.status(201).json({ message: "Book added successfully", data: book });
    } catch (error) {
        return res.status(500).json({ message: "Unable to add book" });
    }
});

// Update book --admin
router.put("/update-book", authenticateToken, isAdmin, async (req, res) => {
    const validationError = validateBookPayload(req.body);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const bookid = getBookId(req);
    if (!validateBookId(bookid, res)) {
        return;
    }

    try {
        const book = await Book.findById(bookid);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        const updateData = {
            url: req.body.url.trim(),
            title: req.body.title.trim(),
            author: req.body.author.trim(),
            price: Number(req.body.price),
            desc: req.body.desc.trim(),
            language: req.body.language.trim(),
        };

        if (req.body.stock !== undefined) {
            updateData.stock = Math.max(0, Number(req.body.stock));
        }
        if (req.body.lowStockThreshold !== undefined) {
            updateData.lowStockThreshold = Math.max(0, Number(req.body.lowStockThreshold));
        }

        Object.assign(book, updateData);
        await book.save();
        return res.status(200).json({ message: "Book updated Successfully", data: book });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update book" });
    }
});

// Quick update stock & threshold --admin
router.put("/admin/update-stock", authenticateToken, isAdmin, async (req, res) => {
    const { bookId, stock, lowStockThreshold } = req.body;
    if (!mongoose.isValidObjectId(bookId)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    const numStock = Number(stock);
    if (stock !== undefined && (!Number.isFinite(numStock) || numStock < 0)) {
        return res.status(400).json({ message: "Stock must be a non-negative number" });
    }

    const updateFields = {};
    if (stock !== undefined) updateFields.stock = numStock;
    if (lowStockThreshold !== undefined) {
        const numThreshold = Number(lowStockThreshold);
        if (Number.isFinite(numThreshold) && numThreshold >= 0) {
            updateFields.lowStockThreshold = numThreshold;
        }
    }

    try {
        const book = await Book.findByIdAndUpdate(bookId, { $set: updateFields }, { new: true });
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }
        return res.status(200).json({ status: "Success", message: "Stock updated successfully", data: book });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update stock" });
    }
});

// Delete book --admin
router.delete("/delete-book", authenticateToken, isAdmin, async (req, res) => {
    const bookid = getBookId(req);
    if (!validateBookId(bookid, res)) {
        return;
    }

    try {
        const book = await Book.findByIdAndDelete(bookid);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        return res.status(200).json({ message: "Book deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Unable to delete book" });
    }
});

// Get all books with search, filter, sort & pagination
router.get("/get-all-books", async (req, res) => {
    try {
        const {
            search = "",
            language = "",
            minPrice,
            maxPrice,
            stock = "",
            sort = "newest",
            page = 1,
            limit = 12,
        } = req.query;

        const query = {};

        // Search in title or author
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [{ title: regex }, { author: regex }, { desc: regex }];
        }

        // Language filter
        if (language && language.trim() && language.toLowerCase() !== "all") {
            query.language = new RegExp(`^${language.trim()}$`, "i");
        }

        // Price range filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.price = {};
            if (minPrice !== undefined && minPrice !== "" && Number.isFinite(Number(minPrice))) {
                query.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined && maxPrice !== "" && Number.isFinite(Number(maxPrice))) {
                query.price.$lte = Number(maxPrice);
            }
            if (Object.keys(query.price).length === 0) {
                delete query.price;
            }
        }

        // Stock availability filter
        if (stock === "in_stock" || stock === "in-stock") {
            query.stock = { $gt: 0 };
        } else if (stock === "out_of_stock" || stock === "out-of-stock") {
            query.stock = { $lte: 0 };
        } else if (stock === "low_stock" || stock === "low-stock") {
            query.$expr = {
                $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", "$lowStockThreshold"] }
                ]
            };
        }

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === "price_low" || sort === "price-low") {
            sortOption = { price: 1 };
        } else if (sort === "price_high" || sort === "price-high") {
            sortOption = { price: -1 };
        } else if (sort === "rating_high" || sort === "rating-high") {
            sortOption = { averageRating: -1, totalReviews: -1 };
        } else if (sort === "title_asc" || sort === "title-asc") {
            sortOption = { title: 1 };
        } else if (sort === "oldest") {
            sortOption = { createdAt: 1 };
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 12);
        const skip = (pageNum - 1) * limitNum;

        const [totalBooks, books, languages] = await Promise.all([
            Book.countDocuments(query),
            Book.find(query).sort(sortOption).skip(skip).limit(limitNum),
            Book.distinct("language"),
        ]);

        const totalPages = Math.ceil(totalBooks / limitNum) || 1;

        return res.json({
            status: "Success",
            data: books,
            totalBooks,
            totalPages,
            currentPage: pageNum,
            pageSize: limitNum,
            availableLanguages: languages.filter(Boolean),
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred fetching books" });
    }
});

// Get recently added books Limit 4
router.get("/get-recent-books", async (req, res) => {
    try {
        const books = await Book.find().sort({ createdAt: -1 }).limit(4);
        return res.json({
            status: "Success",
            data: books,
        });
    } catch (error) {
        return res.status(500).json({ message: "An error occurred" });
    }
});

// Get book by id
router.get("/get-book-by-id/:id", async (req, res) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid book id" });
    }

    try {
        const book = await Book.findById(id);
        if (!book) {
            return res.status(404).json({ message: "Book not found" });
        }

        return res.json({
            status: "Success",
            data: book,
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to fetch book" });
    }
});

module.exports = router;