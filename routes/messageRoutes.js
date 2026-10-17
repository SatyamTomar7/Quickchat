import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  markMessageAsSeen,
  sendMessage,
  editMessage,
  deleteMessage,
  updateReaction,
} from "../controllers/message.controller.js";

const messageRouter = express.Router();
messageRouter.get("/users", protectedRoute, getUsersForSidebar);
messageRouter.put("/mark/:id", protectedRoute, markMessageAsSeen);
messageRouter.post("/send/:id",protectedRoute,sendMessage)
messageRouter.patch("/:id", protectedRoute, editMessage);
messageRouter.delete("/:id", protectedRoute, deleteMessage);
messageRouter.put("/:id/reactions", protectedRoute, updateReaction);
messageRouter.get("/:id", protectedRoute, getMessages);
export default messageRouter;
