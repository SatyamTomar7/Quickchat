import Conversation from "../models/Conversation.js";

export const isMember = (conversation, userId) =>
  conversation.members.some((member) => member.toString() === userId.toString());

export const isAdmin = (conversation, userId) =>
  conversation.admins.some((admin) => admin.toString() === userId.toString());

export const getAuthorizedConversation = (id, userId) =>
  Conversation.findOne({ _id: id, members: userId, deleted: false });
