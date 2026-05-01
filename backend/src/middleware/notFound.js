/**
 * 404 handler for unmatched routes (place after all route registrations).
 */
export function notFound(req, res) {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    details: req.originalUrl,
  });
}
