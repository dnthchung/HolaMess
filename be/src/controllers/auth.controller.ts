import User, { IUser } from '../models/User';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger'; // Import logger
import { createUserSession, removeUserSession } from '../utils/authMiddleware';
import { AuthRequest } from '../utils/authMiddleware';
import bcrypt from 'bcrypt';
import Session from '../models/Session';

export const signup: RequestHandler = async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

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

    // Create session and generate token
    const token = await createUserSession(user._id.toString(), deviceInfo);

    res.status(201).json({
      message: 'Signup successful',
      user: { id: user._id, phone, name },
      token
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
    // Create session and generate token
    const token = await createUserSession(user._id.toString(), deviceInfo);

    res.json({
      id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      token
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

    if (!token) {
      res.status(400).json({ error: 'No token provided' });
      return;
    }

    const success = await removeUserSession(token);

    if (success) {
      logger.info('Logout successful', { userId: req.user?._id });
      res.json({ message: 'Logged out successfully' });
    } else {
      logger.warn('Logout failed - Session not found', { userId: req.user?._id });
      res.status(404).json({ error: 'Session not found' });
    }
  } catch (err) {
    logger.error('Logout failed with server error', err);
    res.status(500).json({ error: 'Server error (logout)' });
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

    const sessionData = sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      isCurrentSession: session.token === req.token
    }));

    res.json(sessionData);
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
