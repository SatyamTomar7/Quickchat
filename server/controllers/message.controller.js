import Message from "../models/Message.js";
import User from "../models/User.js";
import {cloudinary} from "../lib/cloudinary.js";
import { emitToUser, userSocketMap } from "../server.js";
import { editMessageSchema, getBase64ImageSize, isValidObjectId, MAX_IMAGE_SIZE, messageSchema, reactionSchema } from "../lib/validation.js";
import { getValidationMessage, sendError } from "../lib/http.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } })
      .select("_id fullName profilePic bio")
      .lean();

    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      const count = await Message.countDocuments({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (count > 0) {
        unseenMessages[user._id] = count;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.error("Sidebar users failed:", error.message);
    sendError(res, 500, "Unable to load users");
  }
};
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;
    if (!isValidObjectId(selectedUserId)) return sendError(res, 400, "Invalid user ID");
    if (selectedUserId === myId.toString()) return sendError(res, 400, "Cannot open your own conversation");
    const otherUser = await User.exists({ _id: selectedUserId });
    if (!otherUser) return sendError(res, 404, "User not found");
    const seenMessages = await Message.find({
      senderId: selectedUserId, receiverId: myId,
      status: { $ne: "seen" },
    }).select("_id senderId");
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, status: { $ne: "seen" } },
      { $set: { seen: true, status: "seen" } },
    );
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }).lean();
    for (const message of messages) {
      if (message.seen && message.status === "sent") message.status = "seen";
    }
    for (const message of seenMessages) {
      emitToUser(message.senderId, "messageStatus", { messageId: message._id, status: "seen" });
    }
    res.json({ success: true, messages });
  } catch (error) {
    console.error("Messages lookup failed:", error.message);
    sendError(res, 500, "Unable to load messages");
  }
};
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendError(res, 400, "Invalid message ID");
    const message = await Message.findOneAndUpdate(
      { _id: id, receiverId: req.user._id },
      { $set: { seen: true, status: "seen" } },
      { new: true },
    );
    if (!message) return sendError(res, 404, "Message not found");
    emitToUser(message.senderId, "messageStatus", { messageId: message._id, status: "seen" });
    res.json({ success: true });
  } catch (error) {
    console.error("Mark message seen failed:", error.message);
    sendError(res, 500, "Unable to update message");
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = messageSchema.parse(req.body);
    const receiverId = req.params.id;
    const senderId = req.user._id;
    if (!isValidObjectId(receiverId)) return sendError(res, 400, "Invalid recipient ID");
    if (receiverId === senderId.toString()) return sendError(res, 400, "Cannot message yourself");
    const receiver = await User.exists({ _id: receiverId });
    if (!receiver) return sendError(res, 404, "Recipient not found");
    let imageUrl;
    if (image) {
      if (getBase64ImageSize(image) > MAX_IMAGE_SIZE) {
        return sendError(res, 413, "Image must be 5 MB or smaller");
      }
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });
    if (userSocketMap[receiverId]) {
      const deliveredMessage = await Message.findByIdAndUpdate(
        newMessage._id,
        { $set: { status: "delivered" } },
        { new: true },
      ).lean();
      emitToUser(receiverId, "newMessage", deliveredMessage);
      emitToUser(senderId, "messageStatus", { messageId: newMessage._id, status: "delivered" });
      return res.json({ success: true, newMessage: deliveredMessage });
    }
    res.json({ success: true, newMessage });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Send message failed:", error.message);
    sendError(res, 500, "Unable to send message");
  }
};

const getConversationMessage = async (messageId, userId) => {
  if (!isValidObjectId(messageId)) return null;
  return Message.findOne({
    _id: messageId,
    $or: [{ senderId: userId }, { receiverId: userId }],
  });
};

export const editMessage = async (req, res) => {
  try {
    const { text } = editMessageSchema.parse(req.body);
    const message = await getConversationMessage(req.params.id, req.user._id);
    if (!message) return sendError(res, 404, "Message not found");
    if (message.senderId.toString() !== req.user._id.toString()) return sendError(res, 403, "You can only edit your own messages");
    if (message.deleted || message.image) return sendError(res, 400, "This message cannot be edited");
    message.text = text;
    message.edited = true;
    await message.save();
    const payload = { messageId: message._id, text: message.text, edited: true };
    emitToUser(message.receiverId, "messageEdited", payload);
    emitToUser(message.senderId, "messageEdited", payload);
    res.json({ success: true, message });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Edit message failed:", error.message);
    sendError(res, 500, "Unable to edit message");
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await getConversationMessage(req.params.id, req.user._id);
    if (!message) return sendError(res, 404, "Message not found");
    if (message.senderId.toString() !== req.user._id.toString()) return sendError(res, 403, "You can only delete your own messages");
    if (message.deleted) return res.json({ success: true, message });
    message.text = undefined;
    message.image = undefined;
    message.deleted = true;
    message.edited = false;
    await message.save();
    const payload = { messageId: message._id, deleted: true };
    emitToUser(message.receiverId, "messageDeleted", payload);
    emitToUser(message.senderId, "messageDeleted", payload);
    res.json({ success: true, message });
  } catch (error) {
    console.error("Delete message failed:", error.message);
    sendError(res, 500, "Unable to delete message");
  }
};

export const updateReaction = async (req, res) => {
  try {
    const { emoji } = reactionSchema.parse(req.body);
    const message = await getConversationMessage(req.params.id, req.user._id);
    if (!message) return sendError(res, 404, "Message not found");
    if (message.deleted) return sendError(res, 400, "Deleted messages cannot have reactions");
    const userId = req.user._id.toString();
    const existingIndex = message.reactions.findIndex(
      (reaction) => reaction.userId.toString() === userId && reaction.emoji === emoji,
    );
    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ userId: req.user._id, emoji });
    }
    await message.save();
    const payload = { messageId: message._id, reactions: message.reactions };
    emitToUser(message.receiverId, "messageReaction", payload);
    emitToUser(message.senderId, "messageReaction", payload);
    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Reaction update failed:", error.message);
    sendError(res, 500, "Unable to update reaction");
  }
};
