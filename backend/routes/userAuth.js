const jwt = require("jsonwebtoken");
const User = require("../models/user");

const JWT_SECRET = process.env.JWT_SECRET || "bookstore123";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && (authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader);

  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ message: "Token invalid or expired. Please sign in again" });
    }

    req.user = user;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  try {
    const usernameClaim = req.user?.authclaims?.find((claim) => claim.name)?.name;
    const username = usernameClaim || req.user?.username || req.user?.name;
    const userId = req.user?.id || req.user?._id || req.headers?.id;

    let user = null;
    if (username) {
      user = await User.findOne({ username }).select("role");
    } else if (userId) {
      user = await User.findById(userId).select("role");
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { authenticateToken, isAdmin, JWT_SECRET };