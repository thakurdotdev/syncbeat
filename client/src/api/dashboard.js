import { api } from "./http"

export const dashboardKeys = { mine: () => ["dashboard", "mine"] }

export const fetchMyDashboard = async () => (await api.get("/dashboard")).data
