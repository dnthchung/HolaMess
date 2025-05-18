"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import ChatPage from "./pages/ChatPage"
import { UserProvider } from "./contexts/UserContext"
import { SocketProvider } from "./contexts/SocketContext"

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user")
    if (user) {
      setIsAuthenticated(true)
    }
  }, [])

  return (
    <UserProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route
                path="/signup"
                element={
                  !isAuthenticated ? <SignupPage setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/chat" />
                }
              />
              <Route
                path="/login"
                element={
                  !isAuthenticated ? <LoginPage setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/chat" />
                }
              />
              <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />} />
              <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </UserProvider>
  )
}

export default App
