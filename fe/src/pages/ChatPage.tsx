"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useUser } from "../contexts/UserContext"
import { useSocket } from "../contexts/SocketContext"
import UserList from "../components/UserList"
import ChatWindow from "../components/ChatWindow"
import MessageInput from "../components/MessageInput"

interface User {
  _id: string
  name: string
  phone: string
}

interface Message {
  _id: string
  sender: string
  receiver: string
  content: string
  createdAt: string
  read: boolean
}

const ChatPage = () => {
  const { user, setUser } = useUser()
  const { socket, isConnected } = useSocket()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [recentConversations, setRecentConversations] = useState<any[]>([])
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/auth/users")
        // Filter out current user
        const filteredUsers = response.data.filter((u: User) => u._id !== user?._id)
        setUsers(filteredUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    if (user) {
      fetchUsers()
    }
  }, [user])

  // Fetch recent conversations
  useEffect(() => {
    const fetchRecentConversations = async () => {
      if (!user) return

      try {
        const response = await axios.get(`/api/messages/recent/${user._id}`)
        setRecentConversations(response.data)
      } catch (error) {
        console.error("Error fetching recent conversations:", error)
      }
    }

    fetchRecentConversations()
  }, [user])

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return

    const handlePrivateMessage = (msg: Message) => {
      if (
        (selectedUser && (msg.sender === selectedUser._id || msg.receiver === selectedUser._id)) ||
        msg.sender === user?._id ||
        msg.receiver === user?._id
      ) {
        setMessages((prevMessages) => [...prevMessages, msg])
      }
    }

    socket.on("private_message", handlePrivateMessage)

    return () => {
      socket.off("private_message", handlePrivateMessage)
    }
  }, [socket, selectedUser, user])

  // Fetch conversation when a user is selected
  useEffect(() => {
    const fetchConversation = async () => {
      if (!user || !selectedUser) return

      setLoading(true)
      try {
        const response = await axios.get(`/api/messages/conversation/${user._id}/${selectedUser._id}`)
        setMessages(response.data)

        // Mark messages as read
        await axios.put(`/api/messages/mark-read/${user._id}/${selectedUser._id}`)
      } catch (error) {
        console.error("Error fetching conversation:", error)
      } finally {
        setLoading(false)
      }
    }

    if (selectedUser) {
      fetchConversation()
    }
  }, [selectedUser, user])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleUserSelect = (selectedUser: User) => {
    setSelectedUser(selectedUser)
  }

  const handleSendMessage = (content: string) => {
    if (!socket || !user || !selectedUser || !content.trim()) return

    const messageData = {
      sender: user._id,
      receiver: selectedUser._id,
      content: content.trim(),
    }

    socket.emit("private_message", messageData)
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null)
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="font-semibold text-lg">{user?.name}</div>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
            Logout
          </button>
        </div>

        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleUserSelect}
          recentConversations={recentConversations}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold mr-3">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{selectedUser.name}</div>
                <div className="text-sm text-gray-500">{selectedUser.phone}</div>
              </div>
              <div className="ml-auto text-sm">
                {isConnected ? (
                  <span className="text-green-500 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Connected
                  </span>
                ) : (
                  <span className="text-gray-500">Disconnected</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <ChatWindow
              messages={messages}
              currentUserId={user?._id || ""}
              loading={loading}
              messagesEndRef={messagesEndRef}
            />

            {/* Message input */}
            <MessageInput onSendMessage={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Welcome to the Chat App</h3>
              <p className="mt-1 text-sm text-gray-500">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPage
