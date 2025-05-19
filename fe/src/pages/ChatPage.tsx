"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useUser } from "../contexts/UserContext"
import { useSocket } from "../contexts/SocketContext"
import UserList from "../components/UserList"
import ChatWindow from "../components/ChatWindow"
import MessageInput from "../components/MessageInput"
import type { User, Message, RecentConversation } from "../types"

const ChatPage = () => {
  const { user, setUser } = useUser()
  const { socket, isConnected } = useSocket()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return

      try {
        const response = await axios.get(`/api/auth/users?exclude=${user.phone}`)
        // console.log("Fetched users:", response.data)

        const fetchedUsers = response.data.map((u: any) => ({
          id: u._id || u.id,
          name: u.name,
          phone: u.phone,
        }))

        setUsers(fetchedUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    if (user) {
      fetchUsers()

      const intervalId = setInterval(fetchUsers, 30000)

      return () => clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    const fetchRecentConversations = async () => {
      if (!user || !user.id) return

      try {
        const response = await axios.get(`/api/messages/recent/${user.id}`)
        // console.log("Fetched recent conversations:", response.data)
        setRecentConversations(response.data)
      } catch (error) {
        console.error("Error fetching recent conversations:", error)
      }
    }

    if (user && user.id) {
      fetchRecentConversations()

      const intervalId = setInterval(fetchRecentConversations, 15000)

      return () => clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    if (!socket) return

    const handlePrivateMessage = (msg: Message) => {
      console.log("Received private message:", msg)

      if (pendingMessages.has(msg._id)) {
        console.log("Skipping already displayed message:", msg._id)
        setPendingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(msg._id)
          return newSet
        })
        return
      }

      if (
        (selectedUser && (msg.sender === selectedUser.id || msg.receiver === selectedUser.id)) ||
        msg.sender === user?.id ||
        msg.receiver === user?.id
      ) {
        setMessages((prevMessages) => [...prevMessages, msg])
      }

      if (user && user.id) {
        axios
          .get(`/api/messages/recent/${user.id}`)
          .then((response) => setRecentConversations(response.data))
          .catch((error) => console.error("Error refreshing conversations:", error))
      }
    }

    socket.on("private_message", handlePrivateMessage)

    return () => {
      socket.off("private_message", handlePrivateMessage)
    }
  }, [socket, selectedUser, user, pendingMessages])

  useEffect(() => {
    const fetchConversation = async () => {
      if (!user || !selectedUser || !user.id || !selectedUser.id) {
        console.error("Cannot fetch conversation - missing user IDs:", {
          userId: user?.id,
          selectedUserId: selectedUser?.id,
        })
        return
      }

      setLoading(true)
      try {
        console.log("Fetching conversation between", user.id, "and", selectedUser.id)
        const response = await axios.get(`/api/messages/conversation/${user.id}/${selectedUser.id}`)
        console.log("Fetched conversation:", response.data)
        setMessages(response.data)

        await axios.put(`/api/messages/mark-read/${user.id}/${selectedUser.id}`)

        const recentsResponse = await axios.get(`/api/messages/recent/${user.id}`)
        setRecentConversations(recentsResponse.data)
      } catch (error) {
        console.error("Error fetching conversation:", error)
      } finally {
        setLoading(false)
      }
    }

    if (selectedUser && selectedUser.id) {
      fetchConversation()
    }
  }, [selectedUser, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleUserSelect = (selectedUser: User) => {
    // console.log("User selected:", selectedUser)
    if (!selectedUser || !selectedUser.id) {
      console.error("Selected user has no ID:", selectedUser)
      return
    }
    setSelectedUser(selectedUser)
  }

  const handleSendMessage = (content: string) => {
    if (!socket || !user || !selectedUser || !content.trim() || !user.id || !selectedUser.id) {
      console.error("Cannot send message:", {
        socketExists: !!socket,
        userExists: !!user,
        userId: user?.id,
        selectedUserExists: !!selectedUser,
        selectedUserId: selectedUser?.id,
        contentValid: !!content.trim(),
      })
      return
    }

    console.log("Preparing to send message:", {
      sender: user.id,
      receiver: selectedUser.id,
      content: content.trim(),
    })

    const messageData = {
      sender: user.id,
      receiver: selectedUser.id,
      content: content.trim(),
    }

    const tempId = `temp-${Date.now()}`

    const tempMessage = {
      _id: tempId,
      sender: user.id,
      receiver: selectedUser.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    }

    setMessages((prev) => [...prev, tempMessage])
    setPendingMessages((prev) => new Set(prev).add(tempId))

    socket.emit("private_message", messageData, (acknowledgement: any) => {
      console.log("Message acknowledgement:", acknowledgement)

      if (acknowledgement && acknowledgement._id) {
        setPendingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(tempId)
          newSet.add(acknowledgement._id)
          return newSet
        })

        setMessages((prev) => prev.map((msg) => (msg._id === tempId ? { ...msg, _id: acknowledgement._id } : msg)))
      }
    })
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    setUser(null)
    navigate("/login")
  }

  return (
    <div className="flex h-screen bg-gray-100">
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

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
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

            <ChatWindow
              messages={messages}
              currentUserId={user?.id || ""}
              loading={loading}
              messagesEndRef={messagesEndRef}
            />

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