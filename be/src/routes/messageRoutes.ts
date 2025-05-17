// /src/routes/messageRoutes.ts
import express from 'express';
import { getMessageHistory } from '../controllers/messageController';
import { authenticateJWT } from '../utils/authMiddleware';

const router = express.Router();
router.get('/history/:partnerId', authenticateJWT, getMessageHistory);

export default router;
