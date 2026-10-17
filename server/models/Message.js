import mongoose, { model, Schema } from "mongoose";
const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    image: { type: String },
    seen: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: { type: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true, maxlength: 16 },
    }], default: [] },
  },
  { timestamps: true },
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
messageSchema.index({ receiverId: 1, seen: 1 });
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ text: "text" });

const Message = model("Message", messageSchema);
export default Message;
