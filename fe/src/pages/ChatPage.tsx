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
  const { socket, isConnected, disconnectSocket } = useSocket()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
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

      // Check if message already exists in messages array
      const messageExists = messages.some(existingMsg => existingMsg._id === msg._id)
     
      if (pendingMessages.has(msg._id)) {
        console.log("Skipping already displayed message:", msg._id)
        setPendingMessages((prev) => {
          const newSet = new Set(prev)
          newSet.delete(msg._id)
          return newSet
        })
        return
      }

      // Prevent adding duplicate messages
      if (messageExists) {
        console.log("Skipping duplicate message:", msg._id)
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
  }, [socket, selectedUser, user, pendingMessages, messages])

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
    // Disconnect socket first
    disconnectSocket()
     
    // Clear user data from storage
    localStorage.removeItem("user")
    sessionStorage.clear()
     
    // Update user context
    setUser(null)
     
    // Redirect to login page
    navigate("/login")
  }

  useEffect(() => {
    if (!socket) return

    // Listen for user online status
    const handleUserOnline = (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        newSet.add(userId)
        return newSet
      })
    }

    // Listen for user offline status
    const handleUserOffline = (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }

    // Get initial online users
    socket.emit('get_online_users', (onlineUserIds: string[]) => {
      setOnlineUsers(new Set(onlineUserIds))
    })

    socket.on('user_online', handleUserOnline)
    socket.on('user_offline', handleUserOffline)

    return () => {
      socket.off('user_online', handleUserOnline)
      socket.off('user_offline', handleUserOffline)
    }
  }, [socket])

  // Handle read receipts from other devices
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = (data: { otherUserId: string }) => {
      console.log("Messages read on another device:", data);
     
      // If the read messages are for the current conversation, update the UI
      if (selectedUser && selectedUser.id === data.otherUserId) {
        // Refresh the conversation to get updated read status
        refreshConversation(user?.id || "", selectedUser.id);
      } else {
        // Otherwise, just refresh the recent conversations list to update unread counts
        refreshRecentConversations();
      }
    };

    // Handle receipts of messages read by the recipient
    const handleReceiptRead = (data: { userId: string, otherUserId: string }) => {
      console.log("Receipt read:", data);
     
      // If this receipt is for the current conversation, update the messages
      if (user?.id === data.otherUserId && selectedUser?.id === data.userId) {
        // Update all messages as read
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.sender === user.id ? { ...msg, read: true } : msg
          )
        );
      }
    };

    socket.on("messages_read", handleMessagesRead);
    socket.on("receipt_read", handleReceiptRead);

    return () => {
      socket.off("messages_read", handleMessagesRead);
      socket.off("receipt_read", handleReceiptRead);
    };
  }, [socket, selectedUser, user]);

  // Function to refresh conversation data
  const refreshConversation = async (userId: string, otherUserId: string) => {
    if (!userId || !otherUserId) return;
     
    try {
      console.log("Refreshing conversation between", userId, "and", otherUserId);
      const response = await axios.get(`/api/messages/conversation/${userId}/${otherUserId}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error refreshing conversation:", error);
    }
  };

  // Function to refresh recent conversations
  const refreshRecentConversations = async () => {
    if (!user || !user.id) return;
     
    try {
      const response = await axios.get(`/api/messages/recent/${user.id}`);
      setRecentConversations(response.data);
    } catch (error) {
      console.error("Error refreshing recent conversations:", error);
    }
  };

  // Handle input focus (mark messages as read)
  const handleInputFocus = async () => {
    if (!user || !selectedUser || !user.id || !selectedUser.id) return;
     
    try {
      // Call API to mark messages as read
      await axios.put(`/api/messages/mark-read-focus/${user.id}/${selectedUser.id}`);
     
      // Update messages locally
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.receiver === user.id ? { ...msg, read: true } : msg
        )
      );
     
      // Update recent conversations to reflect read status
      refreshRecentConversations();
     
      // Notify via socket
      if (socket) {
        socket.emit("mark_read", { userId: user.id, otherUserId: selectedUser.id });
      }
    } catch (error) {
      console.error("Error marking messages as read on focus:", error);
    }
  };

  // Function to format user's activity status
  const formatUserStatus = (userId: string) => {
    // Check if the user is in the online users set
    const isOnline = onlineUsers.has(userId);

    if (isOnline) {
      return (
        <span className="text-green-500 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          Online
        </span>
      );
    }

    // Find the user in the conversation list to get last activity time
    const conversation = recentConversations.find(conv => conv._id === userId);
    if (conversation && conversation.lastMessage?.createdAt) {
      const lastActiveTime = new Date(conversation.lastMessage.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - lastActiveTime.getTime();

      // Within 1 hour
      if (diffMs < 60 * 60 * 1000) {
        const minutes = Math.floor(diffMs / (60 * 1000));
        return (
          <span className="text-gray-500 text-sm">
            Active {minutes} min ago
          </span>
        );
      }

      // Within 24 hours
      if (diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (60 * 60 * 1000));
        return (
          <span className="text-gray-500 text-sm">
            Active {hours}h ago
          </span>
        );
      }

      // More than a day
      return (
        <span className="text-gray-500 text-sm">
          Last seen {lastActiveTime.toLocaleDateString()}
        </span>
      );
    }

    return (
      <span className="text-gray-500 text-sm">
        Offline
      </span>
    );
  };

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
          onlineUsers={onlineUsers}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold mr-3">
                {selectedUser?.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{selectedUser?.name}</div>
                <div className="text-sm text-gray-500">{selectedUser?.phone}</div>
              </div>
              <div className="ml-auto text-sm">
                {selectedUser && formatUserStatus(selectedUser.id)}
              </div>
            </div>

            <ChatWindow
              messages={messages}
              currentUserId={user?.id || ""}
              loading={loading}
              messagesEndRef={messagesEndRef}
            />

            <MessageInput onSendMessage={handleSendMessage} onFocus={handleInputFocus} />
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
