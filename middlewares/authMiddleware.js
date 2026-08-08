// Auth verification middleware placeholder (useful if server-side auth checks are added in future)
export const verifyAuth = (req, res, next) => {
  // Pass-through since client-side firebase auth is currently verified directly via frontend state.
  // Can easily be configured to parse Authorization: Bearer <token> headers later.
  next();
};
