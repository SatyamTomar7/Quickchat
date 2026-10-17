import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  markMessageAsSeen,
  sendMessage
} from "../controllers/message.controller.js";

const messageRouter = express.Router();
messageRouter.get("/users", protectedRoute, getUsersForSidebar);
messageRouter.put("/mark/:id", protectedRoute, markMessageAsSeen);
messageRouter.post("/send/:id",protectedRoute,sendMessage)
messageRouter.get("/:id", protectedRoute, getMessages);
export default messageRouter;
