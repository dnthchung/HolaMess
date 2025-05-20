// /src/utils/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from '../config';
import User from '../models/User';
import Session from '../models/Session';
import { logger } from './logger';

// Extend the Express Request type to include user property
export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

// Middleware to authenticate JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    console.log(req);
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

    if (!token) {
      logger.warn('Authentication failed - No token provided');
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    // Verify the token
    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        logger.warn('Authentication failed - Invalid token', { error: err.message });
        res.status(403).json({ error: 'Forbidden - Invalid token' });
        return;
      }

      // Use immediately invoked async function to handle Promise-based code
      (async () => {
        try {
          // Check if session exists and is valid
          const session = await Session.findOne({ token });
          if (!session) {
            logger.warn('Authentication failed - Invalid session', { userId: decoded.id });
            res.status(403).json({ error: 'Forbidden - Invalid session' });
            return;
          }

          // Update last active time for the session
          session.lastActive = new Date();
          await session.save();

          // Find the user
          const user = await User.findById(decoded.id).select('-password');
          if (!user) {
            logger.warn('Authentication failed - User not found', { userId: decoded.id });
            res.status(403).json({ error: 'Forbidden - User not found' });
            return;
          }

          // Set the user and token in the request object
          req.user = user;
          req.token = token;

          next();
        } catch (error) {
          logger.error('Authentication middleware error', error);
          res.status(500).json({ error: 'Internal server error during authentication' });
        }
      })();
    });
  } catch (error) {
    logger.error('Unexpected error in authentication middleware', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate and manage sessions
export const createUserSession = async (userId: string, deviceInfo: string): Promise<string> => {
  try {
    // Create JWT token with explicit typing
    // @ts-ignore - Ignoring type issues with jwt.sign
    const token = jwt.sign(
      { id: userId },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    // Check how many active sessions the user has
    const userSessions = await Session.find({ userId }).sort({ lastActive: 1 });

    // If user has 3 or more sessions, remove the oldest one
    if (userSessions.length >= 3) {
      const oldestSession = userSessions[0];
      logger.info('Removing oldest session for user', {
        userId,
        sessionId: oldestSession._id,
        deviceInfo: oldestSession.deviceInfo,
        createdAt: oldestSession.createdAt
      });
      await Session.findByIdAndDelete(oldestSession._id);
    }

    // Create a new session
    const newSession = new Session({
      userId,
      token,
      deviceInfo,
      lastActive: new Date(),
    });

    await newSession.save();
    logger.info('Created new session for user', {
      userId,
      sessionId: newSession._id,
      deviceInfo,
    });

    return token;
  } catch (error) {
    logger.error('Error creating user session', error, { userId, deviceInfo });
    throw error;
  }
};

// Function to handle user logout
export const removeUserSession = async (token: string): Promise<boolean> => {
  try {
    const result = await Session.findOneAndDelete({ token });
    return !!result;
  } catch (error) {
    logger.error('Error removing user session', error, { token });
    throw error;
  }
};
