import { Loader2 } from "lucide-react"
import { useContext } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Context } from "./Context/Context"
import Login from "./components/Auth/Login"
import Profile from "./components/Auth/Profile"
import Register from "./components/Auth/Register"
import ResetPassword from "./components/Auth/ResetPassword"
import VerifyUser from "./components/Auth/VerifyUser"
import Footer from "./components/LandingPage/Footer"
import Header from "./components/LandingPage/Header"
import AppOverlays from "./components/music/AppOverlays"
import Navbar from "./components/Navbar"
import NotFoundPage from "./components/NotFound"
import { useProfileSuspenseQuery } from "./hooks/queries/useProfileQuery"
import AdminDashboard from "./Pages/Admin/AdminDashboard"
import AdminLayout from "./Pages/Admin/AdminLayout"
import AdminLogin from "./Pages/Admin/AdminLogin"
import AdminPlaylists from "./Pages/Admin/AdminPlaylists"
import AdminSongs from "./Pages/Admin/AdminSongs"
import AdminUserDetail from "./Pages/Admin/AdminUserDetail"
import AdminUsers from "./Pages/Admin/AdminUsers"
import Charts from "./Pages/Charts/Charts"
import Dashboard from "./Pages/Dashboard/Dashboard"
import GroupMusic from "./Pages/GroupMusic/GroupMusic"
import Library from "./Pages/Library/Library"
import PlaylistDetail from "./Pages/Library/PlaylistDetail"

const ProfileLoader = ({ children }) => {
  useProfileSuspenseQuery()
  return children
}

const Fallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)

export const privateRoutes = [
  { path: "/profile", element: <Profile /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/music", element: <GroupMusic /> },
  { path: "/library", element: <Library /> },
  { path: "/playlists/:id", element: <PlaylistDetail /> },
  { path: "/charts", element: <Charts /> },
]

export const adminLoginRoute = { path: "/admin/login", element: <AdminLogin /> }

export const adminRoutes = [
  { index: true, element: <AdminDashboard /> },
  { path: "users", element: <AdminUsers /> },
  { path: "users/:id", element: <AdminUserDetail /> },
  { path: "songs", element: <AdminSongs /> },
  { path: "playlists", element: <AdminPlaylists /> },
  { path: "charts", element: <Charts /> },
]

export const publicRoutes = [
  { path: "/", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/verify", element: <VerifyUser /> },
  { path: "/login", element: <Login /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "*", element: <NotFoundPage /> },
]

/** Shared auth checks: returns a redirect element, or null when the user may continue. */
const useAuthRedirect = () => {
  const { user, loading } = useContext(Context)
  const location = useLocation()

  if (loading) return <Fallback />
  if (!user?.email) return <Navigate to={`/login?returnTo=${location.pathname}`} replace />
  if (!user?.verified) return <Navigate to="/verify" state={{ email: user?.email }} replace />
  return null
}

export const AdminRoutes = () => {
  const { user, loading } = useContext(Context)
  const location = useLocation()

  if (loading) return <Fallback />
  // The admin portal has its own sign-in page
  if (!user?.email) return <Navigate to={`/admin/login?returnTo=${location.pathname}`} replace />
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />

  return (
    <ProfileLoader>
      <AdminLayout />
      <AppOverlays />
    </ProfileLoader>
  )
}

export const ProtectedRoutes = () => {
  const redirect = useAuthRedirect()
  if (redirect) return redirect

  return (
    <>
      <Navbar />
      <main className="w-full transition-all duration-300">
        <div className="mt-14 h-[calc(100vh-56px)]">
          <ProfileLoader>
            <Outlet />
          </ProfileLoader>
        </div>
      </main>
      <AppOverlays />
    </>
  )
}

export const PublicRoutes = () => {
  return (
    <main className="w-full">
      <Header />
      <Outlet />
      <Footer />
    </main>
  )
}
