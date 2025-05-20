// src/routes/auth.routes.ts
import express from "express";
import {
  signup,
  login,
  logout,
  getUsers,
  getUserSessions,
  terminateSession
} from "../controllers/auth.controller";
import { authenticateToken } from "../utils/authMiddleware";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected routes
router.post("/logout", authenticateToken, logout);
router.get("/users", authenticateToken, getUsers);
router.get("/sessions", authenticateToken, getUserSessions);
router.delete("/sessions/:sessionId", authenticateToken, terminateSession);

export default router;
