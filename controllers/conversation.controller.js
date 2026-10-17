import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { cloudinary } from "../lib/cloudinary.js";
import { getAuthorizedConversation, isAdmin, isMember } from "../lib/conversation.js";
import { getBase64ImageSize, groupSchema, isValidObjectId, memberSchema, conversationUpdateSchema, searchSchema, MAX_IMAGE_SIZE, messageSchema } from "../lib/validation.js";
import { getValidationMessage, sendError } from "../lib/http.js";
import { io } from "../server.js";

const publicConversation = (conversation) => ({
  ...conversation.toObject(),
  members: conversation.members,
  admins: conversation.admins,
});

export const listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ members: req.user._id, deleted: false })
      .populate("members", "_id fullName profilePic bio")
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json({ success: true, conversations });
  } catch (error) {
    console.error("Conversation list failed:", error.message);
    sendError(res, 500, "Unable to load conversations");
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds, image } = groupSchema.parse(req.body);
    const uniqueIds = [...new Set([...memberIds, req.user._id.toString()])];
    const members = await User.find({ _id: { $in: uniqueIds } }).select("_id");
    if (members.length !== new Set(uniqueIds).size) return sendError(res, 404, "One or more users were not found");
    let imageUrl = "";
    if (image) {
      if (getBase64ImageSize(image) > MAX_IMAGE_SIZE) return sendError(res, 413, "Group image must be 5 MB or smaller");
      imageUrl = (await cloudinary.uploader.upload(image)).secure_url;
    }
    const conversation = await Conversation.create({
      type: "group",
      name,
      image: imageUrl,
      members: uniqueIds,
      admins: [req.user._id],
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, conversation: publicConversation(conversation) });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Group creation failed:", error.message);
    sendError(res, 500, "Unable to create group");
  }
};

export const getConversation = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid conversation ID");
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id)
      .populate("members", "_id fullName profilePic bio")
      .populate("admins", "_id fullName");
    if (!conversation) return sendError(res, 404, "Conversation not found");
    res.json({ success: true, conversation });
  } catch (error) {
    console.error("Conversation lookup failed:", error.message);
    sendError(res, 500, "Unable to load conversation");
  }
};

export const updateConversation = async (req, res) => {
  try {
    const changes = conversationUpdateSchema.parse(req.body);
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    if (conversation.type !== "group") return sendError(res, 400, "Only groups can be updated");
    if (!isAdmin(conversation, req.user._id)) return sendError(res, 403, "Administrator access required");
    if (changes.image) {
      if (getBase64ImageSize(changes.image) > MAX_IMAGE_SIZE) return sendError(res, 413, "Group image must be 5 MB or smaller");
      changes.image = (await cloudinary.uploader.upload(changes.image)).secure_url;
    }
    Object.assign(conversation, changes);
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Conversation update failed:", error.message);
    sendError(res, 500, "Unable to update conversation");
  }
};

export const addMember = async (req, res) => {
  try {
    const { userId } = memberSchema.parse(req.body);
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    if (conversation.type !== "group" || !isAdmin(conversation, req.user._id)) return sendError(res, 403, "Administrator access required");
    if (isMember(conversation, userId)) return sendError(res, 409, "User is already a member");
    if (!await User.exists({ _id: userId })) return sendError(res, 404, "User not found");
    conversation.members.push(userId);
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Add member failed:", error.message);
    sendError(res, 500, "Unable to add member");
  }
};

export const removeMember = async (req, res) => {
  try {
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    if (conversation.type !== "group" || !isAdmin(conversation, req.user._id)) return sendError(res, 403, "Administrator access required");
    if (!isValidObjectId(req.params.userId)) return sendError(res, 400, "Invalid user ID");
    if (req.params.userId === conversation.createdBy.toString()) return sendError(res, 400, "The group creator cannot be removed");
    conversation.members = conversation.members.filter((member) => member.toString() !== req.params.userId);
    conversation.admins = conversation.admins.filter((admin) => admin.toString() !== req.params.userId);
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    console.error("Remove member failed:", error.message);
    sendError(res, 500, "Unable to remove member");
  }
};

export const leaveConversation = async (req, res) => {
  try {
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    if (conversation.type !== "group") return sendError(res, 400, "Only group members can leave");
    if (conversation.createdBy.toString() === req.user._id.toString()) return sendError(res, 400, "The group creator cannot leave");
    conversation.members = conversation.members.filter((member) => member.toString() !== req.user._id.toString());
    conversation.admins = conversation.admins.filter((admin) => admin.toString() !== req.user._id.toString());
    await conversation.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Leave conversation failed:", error.message);
    sendError(res, 500, "Unable to leave conversation");
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    if (conversation.type !== "group" || conversation.createdBy.toString() !== req.user._id.toString()) {
      return sendError(res, 403, "Only the group creator can delete this group");
    }
    conversation.deleted = true;
    await conversation.save();
    io.to(`conversation:${conversation._id}`).emit("conversation:deleted", {
      conversationId: conversation._id,
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Conversation deletion failed:", error.message);
    sendError(res, 500, "Unable to delete conversation");
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    const { cursor, limit } = searchSchema.pick({ cursor: true, limit: true }).parse(req.query);
    const filter = { conversationId: conversation._id };
    if (cursor) {
      if (!isValidObjectId(cursor)) return sendError(res, 400, "Invalid cursor");
      const cursorMessage = await Message.findById(cursor).select("createdAt");
      if (!cursorMessage) return sendError(res, 400, "Invalid cursor");
      filter.$or = [
        { createdAt: { $lt: cursorMessage.createdAt } },
        { createdAt: cursorMessage.createdAt, _id: { $lt: cursor } },
      ];
    }
    const messages = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
    const ordered = messages.reverse();
    res.json({ success: true, messages: ordered, hasMore: messages.length === limit, nextCursor: ordered[0]?._id || null });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Conversation messages failed:", error.message);
    sendError(res, 500, "Unable to load conversation messages");
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { q, conversationId, cursor, limit } = searchSchema.parse(req.query);
    const conversations = await Conversation.find({ members: req.user._id, deleted: false, ...(conversationId ? { _id: conversationId } : {}) }).select("_id");
    const filter = { conversationId: { $in: conversations.map(({ _id }) => _id) }, $text: { $search: q } };
    if (cursor) filter._id = { $lt: cursor };
    const messages = await Message.find(filter).select("_id conversationId senderId text createdAt").populate("senderId", "fullName profilePic").sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, messages, hasMore: messages.length === limit, nextCursor: messages.at(-1)?._id || null });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Message search failed:", error.message);
    sendError(res, 500, "Unable to search messages");
  }
};

export const sendConversationMessage = async (req, res) => {
  try {
    const { text, image } = messageSchema.parse(req.body);
    const conversation = await getAuthorizedConversation(req.params.id, req.user._id);
    if (!conversation) return sendError(res, 404, "Conversation not found");
    let imageUrl;
    if (image) {
      if (getBase64ImageSize(image) > MAX_IMAGE_SIZE) return sendError(res, 413, "Image must be 5 MB or smaller");
      imageUrl = (await cloudinary.uploader.upload(image)).secure_url;
    }
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      text,
      image: imageUrl,
    });
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();
    io.to(`conversation:${conversation._id}`).emit("conversation:message", message);
    res.status(201).json({ success: true, message });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Conversation message failed:", error.message);
    sendError(res, 500, "Unable to send conversation message");
  }
};
