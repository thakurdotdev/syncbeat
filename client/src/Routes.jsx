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
import Navbar from "./components/Navbar"
import NotFoundPage from "./components/NotFound"
import { useProfileSuspenseQuery } from "./hooks/queries/useProfileQuery"
import GroupMusic from "./Pages/GroupMusic/GroupMusic"

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
  { path: "/music", element: <GroupMusic /> },
]

export const musicOnlyRoutes = [
  { path: "/music", element: <GroupMusic /> },
  { path: "*", element: <Navigate to="/music" replace /> },
]

export const publicRoutes = [
  { path: "/", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/verify", element: <VerifyUser /> },
  { path: "/login", element: <Login /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "*", element: <NotFoundPage /> },
]

export const ProtectedRoutes = () => {
  const { user, loading } = useContext(Context)
  const location = useLocation()

  if (loading) {
    return <Fallback />
  }

  if (!user?.email) {
    return <Navigate to={`/login?returnTo=${location.pathname}`} replace />
  }

  if (!user?.verified) {
    return <Navigate to="/verify" state={{ email: user?.email }} replace />
  }

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
