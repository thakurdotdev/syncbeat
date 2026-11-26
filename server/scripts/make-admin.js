/**
 * Gives a user the admin role. Admins are never created from the public signup page.
 *
 *   Promote an existing account:
 *     pnpm --filter syncvibe-api make-admin someone@example.com
 *
 *   Create a new, already verified admin account:
 *     pnpm --filter syncvibe-api make-admin admin@example.com --create "Admin Name" "StrongPass@123"
 */
require("dotenv").config()
const bcrypt = require("bcrypt")
const sequelize = require("../utils/sequelize")
const User = require("../models/auth/userModel")
const { SALT_ROUNDS } = require("../config/constants")

const run = async () => {
  const [email, flag, name, password] = process.argv.slice(2)
  if (!email) {
    console.log('Usage: make-admin <email> [--create "Name" "Password"]')
    process.exit(1)
  }

  const normalizedEmail = email.trim().toLowerCase()
  let user = await User.findOne({ where: { email: normalizedEmail } })

  if (!user && flag === "--create") {
    if (!name || !password || password.length < 8) {
      throw new Error("--create needs a name and a password of at least 8 characters")
    }
    const username = `${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}${Date.now() % 10000}`
    user = await User.create({
      name,
      username,
      email: normalizedEmail,
      password: await bcrypt.hash(password, SALT_ROUNDS),
      verified: true,
      role: "admin",
    })
    console.log(`Created admin account ${normalizedEmail}`)
  } else if (!user) {
    throw new Error(`No user with email ${normalizedEmail}. Add --create "Name" "Password" to create one.`)
  } else {
    await user.update({ role: "admin", verified: true })
    console.log(`${normalizedEmail} is now an admin`)
  }

  await sequelize.close()
}

run().catch(async (err) => {
  console.error(err.message)
  await sequelize.close()
  process.exit(1)
})
