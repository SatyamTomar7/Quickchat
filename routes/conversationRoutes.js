import express from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  addMember,
  createGroup,
  getConversation,
  getConversationMessages,
  listConversations,
  updateConversation,
  removeMember,
  leaveConversation,
  searchMessages,
  sendConversationMessage,
  deleteConversation,
} from "../controllers/conversation.controller.js";

const router = express.Router();
router.use(protectedRoute);
router.get("/", listConversations);
router.post("/groups", createGroup);
router.get("/search/messages", searchMessages);
router.get("/:id", getConversation);
router.get("/:id/messages", getConversationMessages);
router.post("/:id/messages", sendConversationMessage);
router.patch("/:id", updateConversation);
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);
router.post("/:id/leave", leaveConversation);
router.delete("/:id", deleteConversation);

export default router;
