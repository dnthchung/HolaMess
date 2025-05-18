"use client"

import { useMemo } from "react"

interface User {
  _id: string
  name: string
  phone: string
}

interface RecentConversation {
  _id: string
  userId: string
  name: string
  lastMessage: string
  unreadCount: number
  updatedAt: string
}

interface UserListProps {
  users: User[]
  selectedUser: User | null
  onSelectUser: (user: User) => void
  recentConversations: RecentConversation[]
}

const UserList = ({ users, selectedUser, onSelectUser, recentConversations }: UserListProps) => {
  // Combine users with recent conversations
  const enhancedUsers = useMemo(() => {
    const recentUserIds = recentConversations.map((conv) => conv.userId)

    // First add recent conversations
    const result = recentConversations.map((conv) => {
      const user = users.find((u) => u._id === conv.userId)
      return {
        _id: conv.userId,
        name: user?.name || conv.name,
        phone: user?.phone || "",
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
        updatedAt: conv.updatedAt,
        isRecent: true,
      }
    })

    // Then add other users who don't have recent conversations
    users.forEach((user) => {
      if (!recentUserIds.includes(user._id)) {
        result.push({
          ...user,
          lastMessage: "",
          unreadCount: 0,
          updatedAt: "",
          isRecent: false,
        })
      }
    })

    // Sort by updatedAt (recent first)
    return result.sort((a, b) => {
      if (!a.updatedAt) return 1
      if (!b.updatedAt) return -1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [users, recentConversations])

  const formatTime = (dateString: string) => {
    if (!dateString) return ""

    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-64px)]">
      {enhancedUsers.map((user) => (
        <div
          key={user._id}
          className={`p-3 border-b border-gray-100 flex items-center cursor-pointer hover:bg-gray-50 ${
            selectedUser?._id === user._id ? "bg-indigo-50" : ""
          }`}
          onClick={() => onSelectUser(user)}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold mr-3">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-medium text-gray-900 truncate">{user.name}</h3>
              {user.updatedAt && <span className="text-xs text-gray-500">{formatTime(user.updatedAt)}</span>}
            </div>
            {user.lastMessage && <p className="text-xs text-gray-500 truncate">{user.lastMessage}</p>}
          </div>
          {user.unreadCount > 0 && (
            <div className="ml-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {user.unreadCount}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default UserList
