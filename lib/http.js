export const sendError = (res, status, message) => {
  res.status(status).json({ success: false, message });
};

export const getValidationMessage = (error) =>
  error.issues?.map((issue) => issue.message).join(", ") || "Invalid request";
