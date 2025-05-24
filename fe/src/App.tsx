"use client"

import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import SignupPage from "./pages/SignupPage"
import LoginPage from "./pages/LoginPage"
import ChatPage from "./pages/ChatPage"
import { UserProvider, useUser } from "./contexts/UserContext"
import { SocketProvider } from "./contexts/SocketContext"
import { VoiceCallProvider } from "./contexts/VoiceCallContext"
import VoiceCallWindow from "./components/VoiceCallWindow"

// AuthenticatedRoute component to protect routes
const AuthenticatedRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// UnauthenticatedRoute component for login/signup routes
const UnauthenticatedRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useUser();
  if (user) return <Navigate to="/chat" replace />;
  return children;
};

// AppRoutes component to contain routes, using user context
const AppRoutes = () => {
  const { user, setUser, refreshToken } = useUser();

  useEffect(() => {
    // Check if user is logged in on app start
    const storedUser = localStorage.getItem("user");
    if (storedUser && !user) {
      try {
        const userData = JSON.parse(storedUser);
        // Validate that the user data has the required fields
        if (userData && userData.id && userData.name) {
          setUser(userData);

          // If token exists but is about to expire (less than 20% of its lifetime left),
          // perform a token refresh immediately on app startup
          if (userData.token && userData.expiresIn && userData._lastTokenTime) {
            const tokenLifetime = userData.expiresIn * 1000; // Convert to milliseconds
            const tokenCreatedAt = userData._lastTokenTime;
            const tokenExpiresAt = tokenCreatedAt + tokenLifetime;
            const remainingTime = tokenExpiresAt - Date.now();
            const refreshThreshold = userData.expiresIn * 200; // 20% of total time in milliseconds

            if (remainingTime < refreshThreshold) {
              console.log('🔄 Token near expiration on app startup. Refreshing token...');
              // Refresh token without waiting
              refreshToken().catch(err => {
                console.error('Failed to refresh token on app startup:', err);
              });
            } else {
              console.log('✅ Token still valid on app startup. Remaining time:',
                Math.floor(remainingTime / 1000), 'seconds');
            }
          } else {
            console.log('⚠️ Token data incomplete, may need to refresh');
          }
        } else {
          console.error("Invalid user data in localStorage:", userData);
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, [user, setUser, refreshToken]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/signup"
            element={
              <UnauthenticatedRoute>
                <SignupPage />
              </UnauthenticatedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <UnauthenticatedRoute>
                <LoginPage />
              </UnauthenticatedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <AuthenticatedRoute>
                <ChatPage />
              </AuthenticatedRoute>
            }
          />
          <Route path="/" element={<Navigate to={user ? "/chat" : "/login"} />} />
        </Routes>

        {/* Voice Call Window - Global component */}
        <VoiceCallWindow />
      </div>
    </Router>
  );
};

function App() {
  return (
    <UserProvider>
      <SocketProvider>
        <VoiceCallProvider>
          <AppRoutes />
        </VoiceCallProvider>
      </SocketProvider>
    </UserProvider>
  )
}

export default App
