// src/routes/auth.routes.ts
import express from "express";
import {
  signup,
  login,
  logout,
  getUsers,
  getUserSessions,
  terminateSession,
  refreshToken,
  revokeAllTokens
} from "../controllers/auth.controller";
import { authenticateToken, authenticateRefreshToken } from "../utils/authMiddleware";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh-token", authenticateRefreshToken, refreshToken);

// Protected routes
router.post("/logout", authenticateToken, logout);
router.post("/revoke-all", authenticateToken, revokeAllTokens);
router.get("/users", authenticateToken, getUsers);
router.get("/sessions", authenticateToken, getUserSessions);
router.delete("/sessions/:sessionId", authenticateToken, terminateSession);

export default router;
