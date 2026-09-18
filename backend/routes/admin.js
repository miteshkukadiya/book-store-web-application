const router = require("express").Router();
const mongoose = require("mongoose");
const Book = require("../models/book");
const Order = require("../models/order");
const User = require("../models/user");
const { authenticateToken, isAdmin } = require("./userAuth");

// Dashboard stats with real MongoDB aggregations
router.get("/admin/dashboard-stats", authenticateToken, isAdmin, async (req, res) => {
    try {
        const [
            totalBooks,
            totalUsers,
            totalOrders,
            revenueData,
            ordersByStatus,
            ordersByPaymentStatus,
            lowStockCount,
            outOfStockCount,
            lowStockBooks,
            recentOrders,
            topSellingBooks,
            monthlySales,
        ] = await Promise.all([
            // Total books
            Book.countDocuments(),

            // Total users
            User.countDocuments({ role: "user" }),

            // Total orders
            Order.countDocuments(),

            // Revenue from Paid orders
            Order.aggregate([
                { $match: { paymentStatus: "Paid" } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
            ]),

            // Orders grouped by status
            Order.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),

            // Orders grouped by payment status
            Order.aggregate([
                { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
            ]),

            // Low stock count (0 < stock <= threshold)
            Book.countDocuments({
                $expr: {
                    $and: [
                        { $gt: ["$stock", 0] },
                        { $lte: ["$stock", "$lowStockThreshold"] },
                    ],
                },
            }),

            // Out of stock count (stock <= 0)
            Book.countDocuments({ stock: { $lte: 0 } }),

            // Low or out of stock books list
            Book.find({
                $or: [
                    { stock: { $lte: 0 } },
                    {
                        $expr: {
                            $and: [
                                { $gt: ["$stock", 0] },
                                { $lte: ["$stock", "$lowStockThreshold"] },
                            ],
                        },
                    },
                ],
            })
                .sort({ stock: 1 })
                .limit(10),

            // Recent 10 orders
            Order.find()
                .populate("book", "title price url")
                .populate("user", "username email avatar")
                .sort({ createdAt: -1 })
                .limit(10),

            // Top 5 selling books
            Order.aggregate([
                { $match: { status: { $ne: "Canceled" } } },
                {
                    $group: {
                        _id: "$book",
                        totalSold: { $sum: "$quantity" },
                        totalRevenue: { $sum: "$totalAmount" },
                    },
                },
                { $sort: { totalSold: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "books",
                        localField: "_id",
                        foreignField: "_id",
                        as: "bookDetails",
                    },
                },
                { $unwind: "$bookDetails" },
                {
                    $project: {
                        _id: 1,
                        totalSold: 1,
                        totalRevenue: 1,
                        title: "$bookDetails.title",
                        price: "$bookDetails.price",
                        url: "$bookDetails.url",
                        stock: "$bookDetails.stock",
                    },
                },
            ]),

            // Monthly sales trends for past 6 months
            Order.aggregate([
                {
                    $match: {
                        paymentStatus: "Paid",
                        createdAt: {
                            $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: { $sum: "$totalAmount" },
                        orderCount: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
        ]);

        const statusMap = {
            "Order Placed": 0,
            "Processing": 0,
            "Shipped": 0,
            "Out for delivery": 0,
            "Delivered": 0,
            "Canceled": 0,
        };
        ordersByStatus.forEach((item) => {
            if (item._id) statusMap[item._id] = item.count;
        });

        const paymentMap = {
            "Paid": 0,
            "Pending": 0,
            "Failed": 0,
        };
        ordersByPaymentStatus.forEach((item) => {
            if (item._id) paymentMap[item._id] = item.count;
        });

        return res.status(200).json({
            status: "Success",
            data: {
                totalBooks,
                totalUsers,
                totalOrders,
                totalRevenue: revenueData[0]?.totalRevenue || 0,
                ordersByStatus: statusMap,
                ordersByPaymentStatus: paymentMap,
                lowStockCount,
                outOfStockCount,
                lowStockBooks,
                recentOrders,
                topSellingBooks,
                monthlySales,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to calculate dashboard analytics" });
    }
});

// Get all users for admin
router.get("/admin/get-all-users", authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        // Add order counts for each user
        const userOrderCounts = await Order.aggregate([
            { $group: { _id: "$user", count: { $sum: 1 } } },
        ]);
        const orderCountMap = new Map(userOrderCounts.map((u) => [u._id?.toString(), u.count]));

        const formattedUsers = users.map((user) => ({
            ...user.toObject(),
            orderCount: orderCountMap.get(user._id.toString()) || 0,
        }));

        return res.status(200).json({
            status: "Success",
            data: formattedUsers,
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to fetch users" });
    }
});

// Update user role (admin toggle)
router.put("/admin/update-user-role/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid user id" });
        }

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.role = role;
        await user.save();

        return res.status(200).json({
            status: "Success",
            message: `User role updated to ${role} successfully`,
            data: { id: user._id, username: user.username, role: user.role },
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to update user role" });
    }
});

// Get inventory list for admin
router.get("/admin/inventory", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { filter = "all" } = req.query;
        let query = {};

        if (filter === "out_of_stock") {
            query.stock = { $lte: 0 };
        } else if (filter === "low_stock") {
            query.$expr = {
                $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", "$lowStockThreshold"] },
                ],
            };
        }

        const books = await Book.find(query).sort({ stock: 1, title: 1 });

        return res.status(200).json({
            status: "Success",
            data: books,
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to fetch inventory" });
    }
});

module.exports = router;
