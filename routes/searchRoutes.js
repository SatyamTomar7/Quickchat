import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { searchUsers } from "../controllers/search.controller.js";

const router = express.Router();
router.get("/users", protectedRoute, searchUsers);
export default router;
