// src/routes/message.routes.ts
import express from "express";
import {
  getConversation,
  markAsRead,
  markAsReadOnFocus,
  getRecentConversations,
} from "../controllers/message.controller";
import { authenticateToken } from "../utils/authMiddleware";

const router = express.Router();

// Protected routes (all message routes require authentication)
router.get("/conversation/:userId/:otherUserId", authenticateToken, getConversation);
router.put("/mark-read/:userId/:otherUserId", authenticateToken, markAsRead);
router.put("/mark-read-focus/:userId/:otherUserId", authenticateToken, markAsReadOnFocus);
router.get("/recent/:userId", authenticateToken, getRecentConversations);

export default router;
