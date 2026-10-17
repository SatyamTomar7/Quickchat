import { model, Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    type: { type: String, enum: ["direct", "group"], required: true },
    name: { type: String, trim: true, maxlength: 80 },
    image: { type: String, default: "" },
    members: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessageAt: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

conversationSchema.index({ members: 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, createdBy: 1 });

export default model("Conversation", conversationSchema);
