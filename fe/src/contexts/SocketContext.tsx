"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useUser } from "./UserContext"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  lastActiveTime: Date | null
  status: 'online' | 'offline'
  disconnectSocket: () => void
  otherDevices: DeviceInfo[]
  reconnectSocket: () => void
}

interface DeviceInfo {
  id: string
  deviceInfo: string
  lastActive: Date
  isCurrentDevice: boolean
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastActiveTime, setLastActiveTime] = useState<Date | null>(null)
  const [status, setStatus] = useState<'online' | 'offline'>('offline')
  const [otherDevices, setOtherDevices] = useState<DeviceInfo[]>([])
  const { user, setUser } = useUser()

  const handleLogout = () => {
    localStorage.removeItem("user")
    sessionStorage.clear()
    setUser(null)
  }

  const disconnectSocket = () => {
    if (socket) {
      console.log("Manually disconnecting socket")
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setStatus('offline')
      setOtherDevices([])
    }
  }

  const reconnectSocket = () => {
    if (user && user.token) {
      disconnectSocket()
      initializeSocket()
    }
  }

  const initializeSocket = () => {
    if (!user) return null

    // Connect to socket server - use the same URL as the API
    const newSocket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    })

    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("Socket connected with ID:", newSocket.id)

      // Authenticate with token once connected
      if (user && user.token) {
        newSocket.emit('authenticate', user.token, (response: { success: boolean, error?: string }) => {
          if (response.success) {
            console.log('Socket authenticated successfully');
            setIsConnected(true)
            setStatus('online')
            setLastActiveTime(new Date())
          } else {
            console.error('Socket authentication failed:', response.error);
            setIsConnected(false)
            setStatus('offline')

            // If authentication failed due to token issues, trigger logout
            if (response.error === 'Invalid token' || response.error === 'Invalid session') {
              console.log('Token invalid, logging out');
              handleLogout();
            }
          }
        });
      } else {
        // Legacy support - join with user ID if no token
        console.log("No token available, using legacy join method");
        newSocket.emit("join", user.id)
        setIsConnected(true)
        setStatus('online')
        setLastActiveTime(new Date())
      }
    })

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected")
      setIsConnected(false)
      setStatus('offline')
    })

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error)
      setStatus('offline')
    })

    // Listen for error messages from server
    newSocket.on("error_message", (error) => {
      console.error("Server error:", error)
    })

    // Handle token expired event
    newSocket.on("token_expired", (data) => {
      console.warn("Token expired:", data.message)
      newSocket.disconnect()
      setIsConnected(false)
      setStatus('offline')

      // Trigger logout
      handleLogout()
    })

    // Handle authentication errors
    newSocket.on("auth_error", (data) => {
      console.warn("Authentication error:", data.message)

      // If token expired, trigger logout
      if (data.message === "Token expired") {
        handleLogout()
      }
    })

    // Handle device connected notification
    newSocket.on("device_connected", (data) => {
      console.log("Another device connected:", data)
      // Update other devices list if needed
      setOtherDevices(prev => [...prev, {
        id: data.socketId,
        deviceInfo: data.deviceInfo,
        lastActive: new Date(),
        isCurrentDevice: false
      }])
    })

    // Handle device disconnected notification
    newSocket.on("device_disconnected", (data) => {
      console.log("Another device disconnected:", data)
      // Update other devices list
      setOtherDevices(prev => prev.filter(device => device.id !== data.socketId))
    })

    // Listen for messages read by other devices
    newSocket.on("messages_read", (data) => {
      console.log("Messages read on another device:", data)
      // We'll handle this in the chat page to update UI
    })

    return newSocket
  }

  useEffect(() => {
    let newSocket: Socket | null = null
    let activityInterval: ReturnType<typeof setInterval> | null = null

    if (user) {
      newSocket = initializeSocket()

      // Update last active time periodically when connected
      activityInterval = setInterval(() => {
        if (isConnected) {
          setLastActiveTime(new Date())
        }
      }, 60000) // update every minute
    }

    return () => {
      if (activityInterval) {
        clearInterval(activityInterval)
      }
      if (newSocket) {
        newSocket.disconnect()
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      lastActiveTime,
      status,
      disconnectSocket,
      otherDevices,
      reconnectSocket
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
