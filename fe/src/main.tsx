import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import "./index.css"
import axios from "axios"

// Set base URL for API requests
axios.defaults.baseURL = "http://localhost:3000"

// Add request interceptor to include JWT token in requests
axios.interceptors.request.use(
  config => {
    // Get user data from local storage
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      if (user && user.token) {
        // Add Authorization header with Bearer token
        config.headers.Authorization = `Bearer ${user.token}`
      }
    }
    return config
  },
  error => Promise.reject(error)
)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
