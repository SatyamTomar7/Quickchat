import User from "../models/User.js";
import { sendError, getValidationMessage } from "../lib/http.js";
import { searchSchema } from "../lib/validation.js";

export const searchUsers = async (req, res) => {
  try {
    const { q, cursor, limit } = searchSchema.omit({ conversationId: true }).parse(req.query);
    const filter = {
      _id: { $ne: req.user._id },
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { bio: { $regex: q, $options: "i" } },
      ],
    };
    if (cursor) filter._id.$lt = cursor;
    const users = await User.find(filter).select("_id fullName profilePic bio").sort({ _id: 1 }).limit(limit).lean();
    res.json({ success: true, users, hasMore: users.length === limit, nextCursor: users.at(-1)?._id || null });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("User search failed:", error.message);
    sendError(res, 500, "Unable to search users");
  }
};
