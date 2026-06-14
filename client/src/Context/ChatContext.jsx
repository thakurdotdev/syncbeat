import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import { Context } from "./Context"

export const ChatContext = createContext()

export const useSocket = () => useContext(ChatContext)

export const ChatProvider = ({ children }) => {
  const { user } = useContext(Context)
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [onlineStatuses, setOnlineStatuses] = useState({})
  const [loading, setLoading] = useState(false)
  const [socket, setSocket] = useState(null)
  const socketRef = useRef(null)

  const showNotification = useCallback((message) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    if (document.hasFocus()) return

    const notification = new Notification(`${message?.senderName} sent you a message`, {
      body: message?.content ? message.content : "Sent an attachment",
      icon: "https://res.cloudinary.com/dr7lkelwl/image/upload/c_thumb,h_500,w_500/r_max/f_auto/v1780744511/profiles/profiles_130_1780744510_4a18b0ed9043cc21.jpg",
      tag: `msg-${message?.chatid}`,
    })

    notification.onclick = () => {
      window.focus()
      navigate("/chat", { state: { chatData: message } })
      notification.close()
    }
  }, [navigate])

  const handleMessageReceived = useCallback(
    (messageData) => {
      const { senderid } = messageData

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u?.otherUser?.userid === senderid ? { ...u, lastmessage: messageData.content } : u,
        ),
      )

      showNotification(messageData)
    },
    [showNotification],
  )

  useEffect(() => {
    if (!user?.userid) return

    if (socketRef.current?.connected) return

    const newSocket = io(import.meta.env.VITE_API_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketRef.current = newSocket

    const handleConnect = () => {
      newSocket.emit("setup", { userid: user.userid, name: user.name })
      newSocket.emit("user_online")
      newSocket.emit("get_initial_online_users")
    }

    newSocket.on("connect", handleConnect)
    newSocket.io.on("reconnect", handleConnect)
    newSocket.on("user_online", (userId) => {
      setOnlineStatuses((prev) => ({ ...prev, [userId]: true }))
    })
    newSocket.on("user_offline", (userId) => {
      setOnlineStatuses((prev) => ({ ...prev, [userId]: false }))
    })
    newSocket.on("initial_online_users", (onlineUserIds) => {
      setOnlineStatuses(onlineUserIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}))
    })

    setSocket(newSocket)

    return () => {
      newSocket.removeAllListeners()
      newSocket.io.removeAllListeners()
      newSocket.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [user?.userid, user?.name, handleMessageReceived, showNotification])

  const cleanUpSocket = useCallback(() => {

    setUsers([])
    setOnlineStatuses({})

    if (socketRef.current) {
      socketRef.current.emit("user_offline")
      socketRef.current.removeAllListeners()
      socketRef.current.io.removeAllListeners()
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [])

  const contextValue = {
    users,
    setUsers,
    loading,
    setLoading,
    onlineStatuses,
    setOnlineStatuses,
    socket,
    cleanUpSocket,
  }

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
}
