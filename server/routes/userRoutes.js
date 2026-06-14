const express = require("express")
const authMiddleware = require("../middleware/authMiddleware")
const {
  registerUser,
  loginUser,
  getLoginLogs,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyUser,
  searchUser,
  sendEmailOtp,
  updateUserDetails,
  getUserProfile,
  logoutUser,
  getInviteList,
} = require("../controllers/userController")
const rateLimit = require("express-rate-limit")

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: "Too many reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})

const userRouter = express.Router()

userRouter.route("/register").post(registerUser)

userRouter.route("/sendotp/user").post(sendEmailOtp)

userRouter.route("/verify/user").post(verifyUser)

userRouter.route("/login").post(loginUser)

userRouter.route("/forgot-password").post(forgotPasswordLimiter, forgotPassword)
userRouter.route("/reset-password").post(resetPasswordLimiter, resetPassword)

userRouter.route("/login-logs").get(authMiddleware, getLoginLogs)

userRouter.route("/profile").get(authMiddleware, getUserProfile)

userRouter.route("/logout").get(logoutUser)

userRouter.route("/update-profile").post(authMiddleware, updateUserDetails)

userRouter.route("/change-password").post(authMiddleware, changePassword)

userRouter.route("/user/search").get(searchUser)

userRouter.route("/user/invite-list").get(authMiddleware, getInviteList)

module.exports = userRouter
