import axios from "axios"
import { BadgeCheck, LogOut, Moon, ReceiptIcon, Sun } from "lucide-react"
import { useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ChatContext } from "@/Context/ChatContext"
import { Context } from "@/Context/Context"
import { useTheme } from "@/Context/ThemeProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getProfileCloudinaryUrl } from "@/Utils/Cloudinary"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

const ProfileDropdownMenu = () => {
  const { user, setUser } = useContext(Context)
  const { cleanUpSocket } = useContext(ChatContext)
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const navigate = useNavigate()

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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-10 w-10 rounded-full flex items-center justify-center cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarImage src={getProfileCloudinaryUrl(user.profilepic)} alt={user.name} />
            <AvatarFallback>
              {user.name[0]}
              {user.name[1]}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getProfileCloudinaryUrl(user.profilepic)} alt={user.name} />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              toggleTheme()
            }}
            className="cursor-pointer"
          >
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Light" : "Dark"} mode
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              navigate("/profile")
            }}
            className="cursor-pointer"
          >
            <BadgeCheck />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdownMenu
