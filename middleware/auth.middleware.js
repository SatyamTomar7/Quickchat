import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendError } from "../lib/http.js";

export const protectedRoute = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : req.headers.token;
    if (!token) return sendError(res, 401, "Authentication required");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return sendError(res, 401, "Authentication required");
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return sendError(res, 401, "Authentication required");
    }
    next(error);
  }
};

export const checkAuth = (req, res) => {
  res.json({ success: true, user: req.user });
};
