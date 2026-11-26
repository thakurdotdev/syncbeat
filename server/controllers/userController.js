const { Op } = require("sequelize")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const Yup = require("yup")
const jwt = require("jsonwebtoken")

const User = require("../models/auth/userModel")
const OTP = require("../models/auth/otpModel")
const LoginLog = require("../models/auth/loginLogModel")

const { resendOtp, verifiedMailSender, passwordResetMailSender } = require("../utils/resend")
const { SALT_ROUNDS, OTP_EXPIRY_MINUTES } = require("../config/constants")
const { parseUserAgent, getClientIp, getGeoLocation } = require("../utils/helpers")
const { JWTExpiryDate, CookieExpiryDate } = require("../constant")

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000
const OTP_EXPIRATION_TIME = 60 * 60 * 1000

const registerValidationSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters")
    .matches(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),

  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required")
    .max(255, "Email must not exceed 255 characters")
    .lowercase(),

  password: Yup.string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),

  bio: Yup.string().max(500, "Bio must not exceed 500 characters").nullable(),
})

const loginValidationSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
})

const updateValidationSchema = Yup.object().shape({
  name: Yup.string(),
  username: Yup.string(),
  email: Yup.string().email("Invalid email address"),
  bio: Yup.string(),
})

const generateSecureOTP = () => {
  return new Promise((resolve, reject) => {
    crypto.randomInt(100000, 999999, (err, otp) => {
      if (err) reject(err)
      resolve(otp)
    })
  })
}

const generateUniqueUsername = async (name, retryCount = 0) => {
  const baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20)

  const username = retryCount === 0 ? baseUsername : `${baseUsername}${retryCount}`

  const existingUser = await User.findOne({
    where: { username },
    attributes: ["userid"],
  })

  if (existingUser) {
    return generateUniqueUsername(name, retryCount + 1)
  }

  return username
}

const generateSixDigitOTP = () => {
  return crypto.randomInt(100000, 999999)
}

exports.getUserProfile = async (req, res) => {
  try {
    const userid = req.user.userid
    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" })
    }
    const user = await User.findOne({
      where: { userid },
      attributes: { exclude: ["password"] },
      raw: true,
    })
    return res.status(200).json({ user })
  } catch (error) {
    if (res.headersSent) return
    return res.status(500).json({ message: "Failed to fetch profile" })
  }
}

exports.logoutUser = (req, res) => {
  const isProd = process.env.NODE_ENV === "production"
  res.clearCookie("token", {
    domain: process.env.COOKIE_DOMAIN || undefined,
    secure: isProd,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
  })
  res.status(200).json({ message: "success" })
}

exports.getInviteList = async (req, res) => {
  try {
    const currentUserId = req.user.userid
    const { search } = req.query

    const users = await User.findAll({
      where: {
        userid: { [Op.ne]: currentUserId },
        isDeleted: false,
        name: { [Op.iLike]: `%${search.trim()}%` },
      },
      attributes: ["userid", "name", "username", "profilepic"],
      limit: 50,
      raw: true,
    })

    return res.status(200).json({ users })
  } catch (error) {
    console.error("Error fetching invite list:", error)
    return res.status(500).json({ message: "Failed to fetch users" })
  }
}

exports.registerUser = async (req, res) => {
  const transaction = await User.sequelize.transaction()

  try {
    const validatedData = await registerValidationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    })

    const { name, email, password } = validatedData

    const existingUser = await User.findOne({
      where: { email },
      attributes: ["userid", "email"],
      transaction,
    })

    if (existingUser) {
      await transaction.rollback()
      return res.status(409).json({
        status: "error",
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists",
      })
    }

    const username = await generateUniqueUsername(name)

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await User.create(
      {
        name,
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        status: "pending",
      },
      { transaction },
    )

    const otp = await generateSecureOTP()
    await OTP.create(
      {
        userId: user.id,
        email,
        otp,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000),
      },
      { transaction },
    )

    await resendOtp(email, otp)

    await transaction.commit()

    return res.status(201).json({
      status: "success",
      message: "Registration successful. Please verify your email.",
      data: {
        email: user.email,
        requiresVerification: true,
      },
    })
  } catch (error) {
    await transaction.rollback()

    if (error instanceof Yup.ValidationError) {
      return res.status(400).json({
        status: "error",
        code: "VALIDATION_ERROR",
        errors: error.inner.map((err) => ({
          field: err.path,
          message: err.message,
        })),
      })
    }

    console.log(error)

    return res.status(500).json({
      status: "error",
      code: "SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    })
  }
}

/**
 * Login handler. With adminOnly (the separate admin login page) only accounts with
 * role "admin" can sign in; everyone else is refused before a cookie is set.
 */
const createLoginHandler = ({ adminOnly }) => async (req, res) => {
  try {
    await loginValidationSchema.validate(req.body)
    const { email, password } = req.body

    const user = await User.findOne({
      where: { email },
      attributes: [
        "userid",
        "name",
        "username",
        "email",
        "password",
        "profilepic",
        "bio",
        "verified",
        "role",
        "isDeleted",
        "twoFactorEnabled",
      ],
    })

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    if (user.isDeleted) {
      return res.status(401).json({ message: "Account has been deleted or banned" })
    }

    if (adminOnly && user.role !== "admin") {
      return res.status(403).json({ message: "This account does not have admin access" })
    }

    if (user.twoFactorEnabled) {
      return res.status(200).json({
        message: "2FA required",
        twoFactorRequired: true,
        userId: user.userid,
      })
    }

    const token = jwt.sign(
      {
        userid: user.userid,
        role: user.role || "user",
        name: user.name,
        username: user.username,
        email: user.email,
        profilepic: user.profilepic,
        bio: user.bio,
        verified: user.verified,
      },
      process.env.JWT_SECRET,
      { expiresIn: JWTExpiryDate },
    )

    const isProd = process.env.NODE_ENV === "production"

    res
      .status(200)
      .cookie("token", token, {
        domain: process.env.COOKIE_DOMAIN || undefined,
        secure: isProd,
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        expires: CookieExpiryDate,
      })
      .json({ message: "Success", token })

    // Record the login after responding; everything is read from the request on the server
    ;(async () => {
      try {
        await User.update({ lastLogin: new Date() }, { where: { userid: user.userid } })

        if (process.env.NODE_ENV !== "production") return
        const [browserName, osName] = parseUserAgent(req)
        await LoginLog.create({
          ipaddress: getClientIp(req),
          browser: browserName,
          os: osName,
          location: getGeoLocation(req),
          loginType: adminOnly ? "Admin Password" : "Using Password",
          userid: user.userid,
        })
      } catch (error) {
        console.error("Login log error:", error)
      }
    })()
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return res.status(400).json({ message: error.message })
    }
    console.error("Login error:", error)
    return res.status(500).json({ message: "An error occurred during login" })
  }
}

exports.loginUser = createLoginHandler({ adminOnly: false })
exports.adminLogin = createLoginHandler({ adminOnly: true })

exports.getLoginLogs = async (req, res) => {
  try {
    const loginLogs = await LoginLog.findAll({
      where: { userid: req.user.userid },
      order: [["createdAt", "DESC"]],
      raw: true,
    })

    return res.status(200).json(loginLogs)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    const trimmedOldPassword = oldPassword.trim()
    const trimmedNewPassword = newPassword.trim()

    const user = await User.findByPk(req.user.userid)

    if (!user || !(await bcrypt.compare(trimmedOldPassword, user.password))) {
      return res.status(401).json({ message: "Invalid Old Password" })
    }

    if (trimmedOldPassword === trimmedNewPassword) {
      return res.status(400).json({ message: "New password must be different from old password" })
    }

    const hashedPassword = await bcrypt.hash(trimmedNewPassword, 10)

    await user.update({ password: hashedPassword })

    return res.status(200).json({ message: "Password updated successfully" })
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    const user = await User.findOne({ where: { email } })

    if (!user) {
      return res.status(200).json({
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    if (user.isDeleted) {
      return res.status(200).json({
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    if (user.logintype === "GOOGLE") {
      return res.status(400).json({
        message: "This account uses Google login. Please sign in with Google instead.",
      })
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

    await User.update(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
      },
      { where: { userid: user.userid } },
    )

    const clientUrl = process.env.CLIENT_URL

    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`

    await passwordResetMailSender(email, resetUrl)

    return res.status(200).json({
      message: "If an account with that email exists, we've sent a password reset link.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return res.status(500).json({ message: "An error occurred. Please try again later." })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body

    if (!token || !email || !password) {
      return res.status(400).json({ message: "Token, email, and new password are required" })
    }

    if (password.trim().length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const user = await User.findOne({
      where: {
        email,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" })
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10)

    await User.update(
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
      { where: { userid: user.userid } },
    )

    return res.status(200).json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    return res.status(500).json({ message: "An error occurred. Please try again later." })
  }
}

exports.verifyUser = async (req, res) => {
  const { email, otp } = req.body

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" })
  }

  try {
    const user = await User.findOne({ where: { email } })

    if (!user) {
      return res.status(400).json({ message: "User not found" })
    }

    if (user.verified) {
      return res.status(400).json({ message: "User already verified" })
    }

    const storedOTP = await OTP.findOne({
      where: { email },
      order: [["createdat", "DESC"]],
    })

    if (!storedOTP || Date.now() - storedOTP.createdat.getTime() > OTP_EXPIRATION_TIME) {
      return res.status(400).json({ message: "OTP expired" })
    }

    if (otp.toString() === storedOTP.otp.toString()) {
      await user.update({ verified: true })

      await storedOTP.destroy()

      await verifiedMailSender(email, user.username)

      return res.status(200).json({ message: "User verified successfully" })
    } else {
      return res.status(400).json({ message: "Invalid OTP" })
    }
  } catch (error) {
    console.error("Error verifying OTP and updating user verification status:", error)
    return res.status(500).json({
      message: "Failed to verify OTP and update user verification status",
    })
  }
}

exports.searchUser = async (req, res) => {
  try {
    const { name } = req.query

    if (!name) {
      return res.status(400).json({ message: "Name is required" })
    }

    const users = await User.findAll({
      where: {
        name: {
          [Op.iLike]: `%${name}%`,
        },
        isDeleted: false,
      },
      attributes: ["userid", "name", "profilepic", "username"],
    })

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" })
    }

    res.status(200).json({ message: "Success", users })
  } catch (err) {
    console.error("Error fetching users:", err)
    return res.status(500).json({ message: err.message })
  }
}

exports.sendEmailOtp = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: "Email is required" })
  }

  const existingUser = await User.findOne({ where: { email } })

  if (!existingUser) {
    return res.status(400).json({ message: "User not found" })
  }

  if (existingUser.verified) {
    return res.status(400).json({ message: "User already verified " })
  }

  const otp = generateSixDigitOTP()

  await OTP.create({ email, otp })

  const emailRes = await resendOtp(email, otp)

  if (emailRes) {
    return res.status(200).json({ message: "OTP sent successfully" })
  } else {
    return res.status(500).json({ message: "Error sending OTP" })
  }
}

exports.updateUserDetails = async (req, res) => {
  try {
    await updateValidationSchema.validate(req.body, { abortEarly: false })

    const { userid } = req.user

    if (!userid) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const user = await User.findByPk(userid)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const { name, username, email, bio } = req.body

    if (name) user.name = name
    if (username) {
      const existingUser = await User.findOne({
        where: { username, userid: { [Op.ne]: userid } },
      })
      if (existingUser && existingUser.id !== userid) {
        return res.status(400).json({ message: "Username already exists" })
      }
      user.username = username
    }
    if (email) user.email = email
    if (bio) user.bio = bio

    await user.save()

    return res.status(200).json({ message: "User details updated successfully", user })
  } catch (error) {
    if (error instanceof Yup.ValidationError) {
      return res.status(400).json({ message: error.errors.join(", ") })
    }
    console.error("Error updating user details:", error)
    return res.status(500).json({ message: "Internal Server Error" })
  }
}
