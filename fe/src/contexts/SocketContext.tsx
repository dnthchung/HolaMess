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
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastActiveTime, setLastActiveTime] = useState<Date | null>(null)
  const [status, setStatus] = useState<'online' | 'offline'>('offline')
  const { user } = useUser()

  const disconnectSocket = () => {
    if (socket) {
      console.log("Manually disconnecting socket")
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setStatus('offline')
    }
  }

  useEffect(() => {
    if (!user) {
      disconnectSocket()
      return
    }

    // Connect to socket server - use the same URL as the API
    // Try with different transports and options to ensure connection
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
      setIsConnected(true)
      setStatus('online')
      setLastActiveTime(new Date())

      // Join with user ID as per API docs
      newSocket.emit("join", user.id)
      console.log("Emitted join event with user ID:", user.id)
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

    // Update last active time periodically when connected
    const activityInterval = setInterval(() => {
      if (isConnected) {
        setLastActiveTime(new Date())
      }
    }, 60000) // update every minute

    return () => {
      console.log("Cleaning up socket connection")
      clearInterval(activityInterval)
      newSocket.disconnect()
    }
  }, [user])

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      lastActiveTime,
      status,
      disconnectSocket
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
