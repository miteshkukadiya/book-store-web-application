const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
require("./conn/conn");

const User = require("./routes/user");
const Books = require("./routes/book");
const Favourite = require("./routes/favourite");
const Cart = require("./routes/cart");
const Order = require("./routes/order");
const Payment = require("./routes/payment");
const Review = require("./routes/review");
const Admin = require("./routes/admin");

app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
}));
app.use(express.json());

// Health Check
app.get("/api/v1/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Routes
app.use("/api/v1", User);
app.use("/api/v1", Books);
app.use("/api/v1", Favourite);
app.use("/api/v1", Cart);
app.use("/api/v1", Payment);
app.use("/api/v1", Order);
app.use("/api/v1", Review);
app.use("/api/v1", Admin);

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({
        status: "Error",
        message: process.env.NODE_ENV === "production" && statusCode === 500 ? "Internal Server Error" : message,
    });
});

// Start server
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
    console.log("server started at port ", PORT);
});