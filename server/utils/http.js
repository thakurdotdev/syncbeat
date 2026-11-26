const Yup = require("yup")

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

/** Wraps an async route handler so thrown errors reach the Express error handler. */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err instanceof Yup.ValidationError) {
      err.statusCode = 400
      err.message = err.errors?.[0] || "Invalid input"
    }
    next(err)
  })
}

const parseId = (value, label = "id") => {
  const id = Number.parseInt(value, 10)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `Invalid ${label}`)
  return id
}

const parsePaging = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
  return { page, limit, offset: (page - 1) * limit }
}

/** Escapes % and _ so user search text is matched literally inside ILIKE. */
const likePattern = (text) => `%${String(text).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`

module.exports = { HttpError, asyncHandler, parseId, parsePaging, likePattern }
