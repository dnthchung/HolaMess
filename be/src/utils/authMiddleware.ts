// /src/utils/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from '../config';
import User from '../models/User';
import Session from '../models/Session';
import RefreshToken from '../models/RefreshToken';
import { logger } from './logger';
import crypto from 'crypto';

// Extend the Express Request type to include user property
export interface AuthRequest extends Request {
  user?: any;
  token?: string;
  refreshToken?: string;
}

// Define token types
export interface TokenPayload {
  id: string;
  type?: string;
  iat?: number;
  exp?: number;
}

// Interface for token response
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generate a secure random token
export const generateSecureToken = (size = 40): string => {
  return crypto.randomBytes(size).toString('hex');
};

// Generate access token
export const generateAccessToken = (userId: string): string => {
  // @ts-ignore
  return jwt.sign(
    { id: userId, type: 'access' },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  // @ts-ignore
  return jwt.sign(
    { id: userId, type: 'refresh' },
    config.REFRESH_TOKEN_SECRET,
    { expiresIn: config.REFRESH_TOKEN_EXPIRES_IN }
  );
};

// Calculate token expiration time
export const getTokenExpirationTime = (token: string): Date => {
  const decoded = jwt.decode(token) as TokenPayload;
  if (!decoded || !decoded.exp) {
    throw new Error('Invalid token');
  }
  return new Date(decoded.exp * 1000);
};

// Save refresh token to database
export const saveRefreshToken = async (
  userId: string,
  refreshToken: string,
  deviceInfo: string,
  ipAddress: string
): Promise<void> => {
  try {
    // Set expiration date based on token
    const expiresAt = getTokenExpirationTime(refreshToken);

    // Create refresh token document
    const newRefreshToken = new RefreshToken({
      userId,
      token: refreshToken,
      deviceInfo,
      ipAddress,
      expiresAt,
    });

    await newRefreshToken.save();
    logger.info('Refresh token saved', { userId });
  } catch (error) {
    logger.error('Error saving refresh token', error);
    throw error;
  }
};

// Verify token - handles both refresh and access tokens
export const verifyAnyToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    // First try as a refresh token
    try {
      const decoded = jwt.verify(token, config.REFRESH_TOKEN_SECRET) as TokenPayload;

      // Check if token exists in database and is not revoked
      const tokenDoc = await RefreshToken.findOne({
        token,
        isRevoked: false,
      });

      if (!tokenDoc) {
        logger.debug('Token not found as refresh token, trying as access token');
      } else {
        return decoded;
      }
    } catch (refreshError) {
      logger.debug('Not a valid refresh token, trying as access token');
    }

    // Try as an access token
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
      logger.debug('Successfully verified as access token');
      return decoded;
    } catch (accessError) {
      logger.debug('Not a valid access token either');
      return null;
    }
  } catch (error) {
    logger.error('Token verification failed', error);
    return null;
  }
};

// Revoke a specific refresh token
export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const result = await RefreshToken.findOneAndUpdate(
      { token },
      { isRevoked: true, updatedAt: new Date() }
    );
    return !!result;
  } catch (error) {
    logger.error('Error revoking refresh token', error);
    throw error;
  }
};

// Revoke all refresh tokens for a user
export const revokeAllUserRefreshTokens = async (userId: string): Promise<number> => {
  try {
    const result = await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true, updatedAt: new Date() }
    );
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error revoking all user refresh tokens', error);
    throw error;
  }
};

// Generate both access and refresh tokens
export const generateTokens = async (
  userId: string,
  deviceInfo: string,
  ipAddress: string
): Promise<TokenResponse> => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Save the refresh token to the database
  await saveRefreshToken(userId, refreshToken, deviceInfo, ipAddress);

  // Calculate expiration in seconds
  const decoded = jwt.decode(accessToken) as TokenPayload;
  const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;

  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

// Middleware to authenticate JWT token
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format

    if (!token) {
      logger.warn('Authentication failed - No token provided');
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    // Verify the token
    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        // If token is expired but we have a valid refresh token, we'll handle it in the refresh endpoint
        if (err.name === 'TokenExpiredError') {
          logger.warn('Authentication failed - Token expired', { error: err.message });
          res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
          return;
        }

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
    const token = generateAccessToken(userId);

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

// Middleware to handle refresh token
export const authenticateRefreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Debug log all cookies and headers for inspection
    logger.debug('All cookies in request:', {
      service: 'hola-mess-api',
      cookies: req.cookies,
      signedCookies: req.signedCookies,
      hasAuthCookie: !!req.cookies[config.REFRESH_TOKEN_COOKIE_NAME],
      requestBody: req.body
    });

    logger.debug('Request details:', {
      service: 'hola-mess-api',
      url: req.url,
      method: req.method,
      headers: {
        origin: req.headers.origin,
        host: req.headers.host,
        referer: req.headers.referer,
        authorization: req.headers.authorization ? 'Present' : 'Not present',
        cookie: req.headers.cookie ? 'Present' : 'Not present'
      },
      ip: req.ip
    });

    // Extract token from multiple sources with priority:
    // 1. Cookie
    // 2. Request body
    // 3. Authorization header (Bearer token)

    let token: string | null = null;
    let tokenSource = 'none';

    // Check in cookie first
    if (req.cookies && req.cookies[config.REFRESH_TOKEN_COOKIE_NAME]) {
      token = req.cookies[config.REFRESH_TOKEN_COOKIE_NAME];
      tokenSource = 'cookie';
      logger.debug('Token found in cookie');
    }

    // If not in cookie, check request body
    else if (req.body && req.body.refreshToken) {
      token = req.body.refreshToken;
      tokenSource = 'body';
      logger.debug('Token found in request body');
    }

    // Last resort, check authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      tokenSource = 'header';
      logger.debug('Token found in authorization header');
    }

    if (!token) {
      logger.warn('Token authentication failed - No token provided');
      res.status(401).json({ error: 'Unauthorized - No token provided' });
      return;
    }

    // Log token details for debugging
    logger.debug('Processing token request', {
      tokenSource,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + '...',
      hasCookie: !!req.cookies[config.REFRESH_TOKEN_COOKIE_NAME],
      hasAuthHeader: !!(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')),
      hasBodyToken: !!req.body.refreshToken
    });

    // Verify token - can be either refresh or access token
    const decoded = await verifyAnyToken(token);

    if (!decoded) {
      logger.warn('Token authentication failed - Invalid token');
      res.status(403).json({ error: 'Forbidden - Invalid token' });
      return;
    }

    // Find the user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logger.warn('Token authentication failed - User not found', { userId: decoded.id });
      res.status(403).json({ error: 'Forbidden - User not found' });
      return;
    }

    // Set the user and token in the request object
    req.user = user;
    req.refreshToken = token;

    logger.debug('Token authenticated successfully', { userId: user._id });
    next();
  } catch (error) {
    logger.error('Token middleware error', error);
    res.status(500).json({ error: 'Internal server error during token authentication' });
  }
};
