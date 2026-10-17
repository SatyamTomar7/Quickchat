import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  login,
  signup,
  updateProfile,
} from "../controllers/user.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";
const userRouter = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Try again later." },
});
userRouter.post("/signup", authLimiter, signup);
userRouter.post("/login", authLimiter, login);
userRouter.put("/update-profile", protectedRoute, updateProfile);
userRouter.get("/check", protectedRoute, checkAuth);
export default userRouter;
