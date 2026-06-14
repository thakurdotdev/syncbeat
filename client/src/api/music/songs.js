import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL

export const fetchSongRecommendations = async (id) => {
  try {
    const { data } = await axios.get(`${API_URL}/api/play-next/${id}?limit=20`)
    return data?.data || []
  } catch {
    return []
  }
}
