import { generateToken } from "../lib/utils.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { cloudinary } from "../lib/cloudinary.js";
import { getBase64ImageSize, loginSchema, MAX_IMAGE_SIZE, profileSchema, signupSchema } from "../lib/validation.js";
import { getValidationMessage, sendError } from "../lib/http.js";

const publicUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.password;
  return data;
};

// signup a new user
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, bio } = signupSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (user) {
      return sendError(res, 409, "Account already exists");
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      bio,
    });
    const token = generateToken(newUser._id);
    res.json({
      success: true,
      userData: publicUser(newUser),
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    if (error.code === 11000) return sendError(res, 409, "Account already exists");
    console.error("Signup failed:", error.message);
    sendError(res, 500, "Unable to create account");
  }
};
//login a user
export const login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const userData = await User.findOne({ email }).select("+password");
    if (!userData) {
      return sendError(res, 401, "Invalid credentials");
    }
    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return sendError(res, 401, "Invalid credentials");
    }
    const token = generateToken(userData._id);
    res.json({
      success: true,
      userData: publicUser(userData),
      token,
      message: "Login successful",
    });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Login failed:", error.message);
    sendError(res, 500, "Unable to log in");
  }
};

//update profile
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = profileSchema.parse(req.body);
    const userId = req.user._id;
    let updatedUser;
    if (profilePic) {
      if (getBase64ImageSize(profilePic) > MAX_IMAGE_SIZE) {
        return sendError(res, 413, "Profile image must be 5 MB or smaller");
      }
      const upload = await cloudinary.uploader.upload(profilePic);
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true },
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(userId, { bio, fullName }, { new: true });
    }
    res.json({ success: true, user: publicUser(updatedUser) });
  } catch (error) {
    if (error.name === "ZodError") return sendError(res, 400, getValidationMessage(error));
    console.error("Profile update failed:", error.message);
    sendError(res, 500, "Unable to update profile");
  }
};
