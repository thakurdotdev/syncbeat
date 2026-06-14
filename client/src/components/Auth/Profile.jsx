import axios from "axios"
import {
  BadgeCheck,
  Loader2,
  LockKeyhole,
  LogOutIcon,
  Settings,
  Shield,
  User as UserIcon,
} from "lucide-react"
import { useContext, useEffect, useState } from "react"
import { ChatContext } from "@/Context/ChatContext"
import { cn } from "@/lib/utils"
import { Context } from "../../Context/Context"
import LoginLogs from "../Modals/LoginLogs"
import UpdatePassword from "../Modals/UpdatePassword"
import UpdateProfileModel from "../Modals/UpdateProfileModel"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { Card } from "../ui/card"

const ProfileSection = ({ title, icon, children }) => (
  <Card className="rounded-xl shadow-md p-6 mb-6">
    <div className="flex items-center mb-4">
      {icon}
      <h2 className="text-xl font-semibold ml-3 text-gray-800 dark:text-gray-200">{title}</h2>
    </div>
    {children}
  </Card>
)

const Profile = () => {
  const { user, setUser } = useContext(Context)
  const { cleanUpSocket } = useContext(ChatContext)
  const [isLoginLogsOpen, setIsLoginLogsOpen] = useState(false)
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false)
  const [loginLogs, setLoginLogs] = useState([])
  const [updatePassword, setUpdatePassword] = useState(false)
  const [isLogsLoading, setIsLogsLoading] = useState(false)

  const toggleUpdatePassword = () => {
    setUpdatePassword((prev) => !prev)
  }

  const toggleLoginLogs = () => {
    setIsLoginLogsOpen((prev) => !prev)
  }

  const toggleUpdateProfile = () => {
    setIsUpdateProfileOpen((prev) => !prev)
  }

  useEffect(() => {
    getLoginLogs()
  }, [])

  const getLoginLogs = async () => {
    try {
      setIsLogsLoading(true)
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/login-logs`, {
        withCredentials: true,
      })
      if (response.status === 200) {
        setLoginLogs(response.data)
        setIsLogsLoading(false)
      }
    } catch (error) {
      setIsLogsLoading(false)
      console.error("Error fetching login logs:", error)
    }
  }

  const handleLogout = async () => {
    try {
      const { status } = await axios.get(`${import.meta.env.VITE_API_URL}/api/logout`, {
        withCredentials: true,
      })
      if (status === 200) {
        cleanUpSocket()
        setUser(null)
      }
    } catch (error) {
      cleanUpSocket()
      setUser(null)
    }
  }

  return (
    <>
      <div className="p-4">
        <div className=" w-full max-w-4xl mx-auto z-10">
          {/* Profile Header */}
          <Card className="rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-start">
              <div className="relative mb-6 md:mb-0 md:mr-8 group">
                <Avatar
                  className={cn(
                    "w-48 h-48 rounded-full overflow-hidden shadow-lg relative transition-all duration-300",
                  )}
                >
                  <AvatarImage
                    src={user?.profilepic}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="w-full h-full text-3xl">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <div className="mb-4">
                  <h1 className="text-3xl font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                    {user?.name}
                    {user.verified && <BadgeCheck className="text-green-500 ml-2" size={30} />}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">@{user?.username}</p>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">{user?.bio}</p>
              </div>
            </div>
          </Card>

          {/* Profile Management Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            <ProfileSection
              title="Profile Settings"
              icon={<UserIcon size={24} className="text-blue-500" />}
            >
              <div className="space-y-4">
                <Button
                  variant="secondary"
                  onClick={toggleUpdateProfile}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center">
                    <Settings size={20} className="mr-3 text-gray-400" />
                    <span>Edit Profile</span>
                  </div>
                  <UserIcon size={20} className="text-gray-400" />
                </Button>
              </div>
            </ProfileSection>

            <ProfileSection
              title="Account Security"
              icon={<Shield size={24} className="text-green-500" />}
            >
              <div className="space-y-4">
                <Button
                  variant="secondary"
                  onClick={toggleUpdatePassword}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <LockKeyhole size={20} className="mr-3 text-gray-400" />
                    <span>Change Password</span>
                  </div>
                </Button>
                <Button
                  variant="secondary"
                  onClick={toggleLoginLogs}
                  className="w-full flex items-center justify-between"
                  disabled={isLogsLoading}
                >
                  <div className="flex items-center">
                    {isLogsLoading ? (
                      <Loader2 size={20} className="mr-3 text-gray-400 animate-spin" />
                    ) : (
                      <Shield size={20} className="mr-3 text-gray-400" />
                    )}
                    <span>Login History</span>
                  </div>
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <LogOutIcon size={20} className="mr-3 text-gray-400" />
                    <span>Logout</span>
                  </div>
                </Button>
              </div>
            </ProfileSection>
          </div>
        </div>
      </div>

      <UpdateProfileModel
        isOpen={isUpdateProfileOpen}
        toggleDialog={toggleUpdateProfile}
        user={user}
        setUser={setUser}
      />

      <LoginLogs isOpen={isLoginLogsOpen} toggleDialog={toggleLoginLogs} loginLogs={loginLogs} />
      <UpdatePassword isOpen={updatePassword} toggleDialog={toggleUpdatePassword} />
    </>
  )
}

export default Profile
