import Message from "../models/Message.js";
import User from "../models/User.js";
import {cloudinary} from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { getBase64ImageSize, isValidObjectId, MAX_IMAGE_SIZE, messageSchema } from "../lib/validation.js";
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
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }).lean();
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId },
      { seen: true },
    );
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
      { seen: true },
      { new: true },
    );
    if (!message) return sendError(res, 404, "Message not found");
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
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    res.json({ success: true, newMessage });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Send message failed:", error.message);
    sendError(res, 500, "Unable to send message");
  }
};
