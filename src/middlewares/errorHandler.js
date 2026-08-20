import { AppError } from "../utils/AppError.js";

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const globalErrorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode ?? 500;
  const message =
    statusCode === 500 && !error.isOperational
      ? "Internal Server Error"
      : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
