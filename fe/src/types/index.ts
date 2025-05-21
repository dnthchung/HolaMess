// Define types for the application

export interface User {
    id: string // API returns as id
    name: string
    phone: string
    token?: string // JWT token for authentication
    expiresIn?: number // Token expiration time in seconds
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

  export interface TokenData {
    token: string // access token
    expiresIn: number // expiration time in seconds
    refreshToken?: string // refresh token may be sent only on login/signup
  }

  export interface AuthResponse {
    id: string
    name: string
    phone: string
    token: string
    expiresIn: number
  }

  export interface TokenRefreshResponse {
    token: string
    expiresIn: number
  }
