// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error("❌ Global Error Handler caught:", err?.message || err);
  
  const status = err?.status || 500;
  res.status(status).json({
    error: err?.name || "Internal Server Error",
    message: err?.message || "An unexpected error occurred on the server.",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
