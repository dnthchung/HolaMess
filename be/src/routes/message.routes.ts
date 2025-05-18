// src/routes/message.routes.ts
import express from "express";
import {
  getConversation,
  markAsRead,
  getRecentConversations,
} from "../controllers/message.controller";

const router = express.Router();

// Get conversation between two users
router.get("/conversation/:userId/:otherUserId", getConversation);

// Mark messages as read
router.put("/mark-read/:userId/:otherUserId", markAsRead);

// Get user's recent conversations
router.get("/recent/:userId", getRecentConversations);

export default router;