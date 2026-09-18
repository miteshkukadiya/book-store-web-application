const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticateToken, JWT_SECRET } = require("./userAuth");

const getUserId = (req) => {
    if (req.user?.id && mongoose.isValidObjectId(req.user.id)) return req.user.id;
    if (req.user?._id && mongoose.isValidObjectId(req.user._id)) return req.user._id;
    if (req.headers.id && mongoose.isValidObjectId(req.headers.id)) return req.headers.id;
    return null;
};

// Sign Up
router.post("/sign-up", async (req, res) => {
    try {
        const { username, email, password, address } = req.body;

        if (!username || !email || !password || !address) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (username.trim().length <= 3) {
            return res.status(400).json({ message: "Username length should be greater than 3" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ message: "Invalid email address format" });
        }

        if (password.length <= 5) {
            return res.status(400).json({ message: "Password length should be greater than 5" });
        }

        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashPass = await bcrypt.hash(password, 10);

        const newUser = new User({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashPass,
            address: address.trim(),
        });
        await newUser.save();
        return res.status(201).json({ message: "SignUp Successfully" });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Sign In
router.post("/sign-in", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        const existingUser = await User.findOne({ username: username.trim() });
        if (!existingUser) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const authclaims = [
            { name: existingUser.username },
            { role: existingUser.role }
        ];

        const token = jwt.sign(
            { id: existingUser._id, username: existingUser.username, role: existingUser.role, authclaims },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.status(200).json({
            id: existingUser._id,
            role: existingUser.role,
            token: token,
        });

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get User Information
router.get("/get-user-information", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            const usernameClaim = req.user?.authclaims?.find((claim) => claim.name)?.name || req.user?.username;
            if (usernameClaim) {
                const user = await User.findOne({ username: usernameClaim }).select("-password");
                if (user) return res.status(200).json(user);
            }
            return res.status(400).json({ message: "User id required" });
        }

        const data = await User.findById(userId).select("-password");
        if (!data) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Update Address
router.put("/update-address", authenticateToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { address } = req.body;

        if (!address || !address.trim()) {
            return res.status(400).json({ message: "Address is required" });
        }

        if (!userId) {
            return res.status(400).json({ message: "User id required" });
        }

        await User.findByIdAndUpdate(userId, { address: address.trim() });
        return res.status(200).json({ message: "Address Updated Successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;