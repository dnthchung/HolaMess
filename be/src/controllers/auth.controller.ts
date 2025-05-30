import User, { IUser } from '../models/User';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger'; // Import logger
import {
  createUserSession,
  removeUserSession,
  AuthRequest,
  generateTokens,
  revokeRefreshToken,
  revokeAllUserRefreshTokens
} from '../utils/authMiddleware';
import bcrypt from 'bcrypt';
import Session from '../models/Session';
import RefreshToken from '../models/RefreshToken';
import config from '../config';

export const signup: RequestHandler = async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    logger.info('Signup attempt', { phone, name }); // Log thông tin khi bắt đầu
    if (!phone || !password || !name) {
      logger.warn('Signup failed - Missing required fields', { missingFields: { phone: !phone, password: !password, name: !name }, requestBody: req.body }); // Log cảnh báo với ngữ cảnh
      res.status(400).json({ error: 'Missing info' });
      return;
    }
    const exist = await User.findOne({ phone });
    if (exist) {
      logger.warn('Signup failed - Phone already exists', { phone, existingUserId: exist._id, existingUserName: exist.name }); // Log cảnh báo với ngữ cảnh
      res.status(409).json({ error: 'Phone exists', details: 'This phone number is already registered' });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ phone, password: hashedPassword, name }) as IUser;
    // Lưu ý: Ở đây bạn nên băm mật khẩu trước khi lưu.
    // logger.info('Hashing password for user', { phone: user.phone }); // Ví dụ log băm
    await user.save();
    logger.info('Signup successful', { userId: user._id, phone, name }); // Log thông tin thành công
    // Sử dụng user._id thay vì user.id nếu schema Mongoose trả về _id

    // Generate access and refresh tokens
    const { accessToken, refreshToken, expiresIn } = await generateTokens(
      user._id.toString(),
      deviceInfo,
      ipAddress
    );

    // Create session as well for backward compatibility
    await createUserSession(user._id.toString(), deviceInfo);

    // Set refresh token as an HTTP-only cookie
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      maxAge: config.REFRESH_TOKEN_COOKIE_MAXAGE,
      sameSite: config.COOKIE_SAME_SITE,
      path: '/',
      domain: config.COOKIE_DOMAIN
    });

    res.status(201).json({
      message: 'Signup successful',
      user: { id: user._id, phone, name },
      token: accessToken,
      expiresIn
    });
  } catch (err) {
    // Log lỗi server với logger.error, bao gồm đối tượng lỗi và ngữ cảnh request body
    logger.error('Signup failed with server error', err, { requestBody: req.body });
    res.status(500).json({ error: 'Server error (signup)' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    logger.info('Login attempt', { phone }); // Log thông tin
    if (!phone || !password) {
      logger.warn('Login failed - Missing credentials', { missingFields: { phone: !phone, password: !password }, requestBody: req.body }); // Log cảnh báo
      res.status(400).json({ error: 'Missing info' });
      return;
    }
    const user = await User.findOne({ phone }) as IUser;
    // Lưu ý: So sánh mật khẩu không băm là KHÔNG AN TOÀN! Hãy so sánh với mật khẩu đã băm.
    if (!user) {
      logger.warn('Login failed - User not found', { phone });
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    // Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Login failed - Invalid password', { phone });
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    logger.info('Login successful', { userId: user._id, phone: user.phone, name: user.name }); // Log thông tin thành công
     // Sử dụng user._id thay vì user.id
    // Generate access and refresh tokens
    const { accessToken, refreshToken, expiresIn } = await generateTokens(
      user._id.toString(),
      deviceInfo,
      ipAddress
    );

    // Create session as well for backward compatibility
    await createUserSession(user._id.toString(), deviceInfo);

    // Set refresh token as an HTTP-only cookie
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      maxAge: config.REFRESH_TOKEN_COOKIE_MAXAGE,
      sameSite: config.COOKIE_SAME_SITE,
      path: '/',
      domain: config.COOKIE_DOMAIN
    });

    res.json({
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      token: accessToken,
      expiresIn
    });
  } catch (err) {
    // Log lỗi server với logger.error
    logger.error('Login failed with server error', err, { requestBody: req.body });
    res.status(500).json({ error: 'Server error (login)' });
  }
};

export const logout: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const token = req.token;
    const refreshToken = req.cookies[config.REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;

    // Track successful operations for response
    let operations = {
      sessionRemoved: false,
      refreshTokenRevoked: false
    };

    // 1. Remove access token session
    if (token) {
      operations.sessionRemoved = await removeUserSession(token);
    }

    // 2. Revoke refresh token if present
    if (refreshToken) {
      operations.refreshTokenRevoked = await revokeRefreshToken(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie(config.REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE,
      path: '/',
      domain: config.COOKIE_DOMAIN
    });

    // Log action
    if (operations.sessionRemoved || operations.refreshTokenRevoked) {
      logger.info('Logout successful', {
        userId: req.user?._id,
        sessionRemoved: operations.sessionRemoved,
        refreshTokenRevoked: operations.refreshTokenRevoked
      });

      res.json({
        message: 'Logged out successfully',
        operations
      });
    } else {
      logger.warn('Logout issued but no active tokens found', { userId: req.user?._id });
      res.status(200).json({
        message: 'No active session found to logout',
        operations
      });
    }
  } catch (err) {
    logger.error('Logout failed with server error', err);
    res.status(500).json({ error: 'Server error (logout)' });
  }
};

export const refreshToken: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;
    const oldRefreshToken = req.refreshToken;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

    // Debug logging
    logger.debug('Refresh token request received', {
      userId: userId?.toString(),
      hasRefreshToken: !!oldRefreshToken,
      ipAddress,
      deviceInfo: deviceInfo?.substring(0, 50) // Truncate for logging
    });

    if (!userId) {
      logger.warn('Token refresh failed - No user ID');
      res.status(401).json({ error: 'Unauthorized - No user ID found' });
      return;
    }

    // If we have a refresh token, try to revoke it
    if (oldRefreshToken) {
      try {
        await revokeRefreshToken(oldRefreshToken);
        logger.debug('Old refresh token revoked successfully');
      } catch (error) {
        logger.warn('Failed to revoke old refresh token', { error });
        // Continue anyway since we have a valid user
      }
    }

    // Generate new tokens
    const { accessToken, refreshToken, expiresIn } = await generateTokens(
      userId.toString(),
      deviceInfo,
      ipAddress
    );

    // Update session for backward compatibility
    await createUserSession(userId.toString(), deviceInfo);

    // Set new refresh token cookie
    res.cookie(config.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      maxAge: config.REFRESH_TOKEN_COOKIE_MAXAGE,
      sameSite: config.COOKIE_SAME_SITE,
      path: '/',
      domain: config.COOKIE_DOMAIN
    });

    logger.info('Token refreshed successfully', { userId });

    // Return new access token
    res.json({
      token: accessToken,
      expiresIn
    });
  } catch (err) {
    logger.error('Token refresh failed with server error', err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
};

export const revokeAllTokens: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Revoke all refresh tokens for the user
    const revokedCount = await revokeAllUserRefreshTokens(userId.toString());

    // Remove all sessions for the user
    const sessionsResult = await Session.deleteMany({ userId });

    logger.info('All user tokens revoked', {
      userId,
      refreshTokensRevoked: revokedCount,
      sessionsRemoved: sessionsResult.deletedCount
    });

    res.json({
      message: 'All devices logged out successfully',
      refreshTokensRevoked: revokedCount,
      sessionsRemoved: sessionsResult.deletedCount
    });
  } catch (err) {
    logger.error('Revoke all tokens failed with server error', err);
    res.status(500).json({ error: 'Server error during revoke all tokens operation' });
  }
};

export const getUsers: RequestHandler = async (req, res) => { // Áp dụng RequestHandler
  try {
    // Thêm xử lý kiểu cho exclude như đã thảo luận trước
    const { exclude } = req.query;
    let filter = {};
    if (typeof exclude === 'string') {
        filter = { phone: { $ne: exclude } };
    }
    logger.info('Fetching users', { filter }); // Log thông tin với filter

    const users = await User.find(filter).select('-password');
    logger.info('Successfully fetched users', { count: users.length }); // Log thông tin thành công
    res.json(users);
  } catch (err) {
    // Log lỗi server với logger.error
    logger.error('Get users failed with server error', err, { queryParams: req.query });
    res.status(500).json({ error: 'Server error (get users)' });
  }
};

export const getUserSessions: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sessions = await Session.find({ userId }).sort({ lastActive: -1 });
    const refreshTokens = await RefreshToken.find({
      userId,
      isRevoked: false
    }).sort({ createdAt: -1 });

    const sessionData = sessions.map(session => ({
      id: session._id,
      type: 'session',
      deviceInfo: session.deviceInfo,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      isCurrentSession: session.token === req.token
    }));

    const refreshTokenData = refreshTokens.map(token => ({
      id: token._id,
      type: 'refreshToken',
      deviceInfo: token.deviceInfo,
      ipAddress: token.ipAddress,
      lastActive: token.updatedAt,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt
    }));

    res.json({
      sessions: sessionData,
      refreshTokens: refreshTokenData
    });
  } catch (err) {
    logger.error('Get user sessions failed with server error', err);
    res.status(500).json({ error: 'Server error (get user sessions)' });
  }
};

export const terminateSession: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId.toString() !== userId.toString()) {
      res.status(403).json({ error: 'Forbidden - Not your session' });
      return;
    }

    await Session.findByIdAndDelete(sessionId);

    logger.info('Session terminated', { userId, sessionId });
    res.json({ message: 'Session terminated successfully' });
  } catch (err) {
    logger.error('Terminate session failed with server error', err);
    res.status(500).json({ error: 'Server error (terminate session)' });
  }
};
