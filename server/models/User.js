import mongoose, { model ,Schema } from "mongoose";
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true },
    password: { type: String, required: true, minlength: 8, select: false },
    profilePic: { type: String, default: "" },
    bio: { type: String },
  },
  { timestamps: true },
);

const User = model("User", userSchema);
export default User;
