import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID");

const imageDataUrl = z
  .string()
  .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/, "Only PNG, JPEG, and WebP images are supported");

export const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  bio: z.string().trim().min(1).max(500),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(1).max(500),
  profilePic: imageDataUrl.optional(),
}).strict();

export const userIdSchema = z.object({
  id: objectId,
}).strict();

export const messageSchema = z.object({
  text: z.string().trim().max(2000).optional(),
  image: imageDataUrl.optional(),
}).strict().refine(
  ({ text, image }) => Boolean(text || image),
  "A message must contain text or an image",
);

export const isValidObjectId = (value) => objectId.safeParse(value).success;

export const getBase64ImageSize = (value) => {
  const base64 = value.split(",")[1]?.replace(/\s/g, "") || "";
  return Math.ceil((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
};

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
