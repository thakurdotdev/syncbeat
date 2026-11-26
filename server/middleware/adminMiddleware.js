/** Must run after authMiddleware. Only lets users with role "admin" through. */
const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" })
  }
  next()
}

module.exports = adminMiddleware
