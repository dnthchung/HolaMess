"use client"

import { createContext, useState, useContext, type ReactNode } from "react"
import type { User } from "../types"

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem("user")
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        // console.log("Loaded user from localStorage:", parsedUser)
        return parsedUser
      }
      return null
    } catch (error) {
      console.error("Error parsing user from localStorage:", error)
      localStorage.removeItem("user")
      return null
    }
  })

  const updateUser = (newUser: User | null) => {
    console.log("Updating user:", newUser)
    setUser(newUser)
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser))
    } else {
      localStorage.removeItem("user")
    }
  }

  return <UserContext.Provider value={{ user, setUser: updateUser }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
