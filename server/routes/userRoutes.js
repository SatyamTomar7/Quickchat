import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  login,
  signup,
  updateProfile,
} from "../controllers/user.controller.js";
import { checkAuth } from "../middleware/auth.middleware.js";
const userRouter = express.Router();
userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectedRoute, updateProfile);
userRouter.get("/check", protectedRoute, checkAuth);
export default userRouter;
