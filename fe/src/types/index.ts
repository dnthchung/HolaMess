// Define types for the application

export interface User {
    id: string // API returns as id
    name: string
    phone: string
  }

  export interface Message {
    _id: string
    sender: string // userId
    receiver: string // userId
    content: string
    read: boolean
    createdAt: string // ISO
  }

  export interface RecentConversation {
    _id: string // partner id
    userInfo: {
      name: string
      phone: string
    }
    lastMessage: {
      _id: string
      sender: string
      receiver: string
      content: string
      createdAt: string
      read: boolean
    }
    unreadCount: number
  }
