import axios from "axios"

/** Axios instance for our own backend (sends the auth cookie). */
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ""}/api`,
  withCredentials: true,
})

/** Best human-readable message from an API error. */
export const errorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  error?.response?.data?.message || error?.response?.data?.error || fallback
