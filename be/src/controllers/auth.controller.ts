import User from '../models/User';
import { RequestHandler } from 'express';
import { logger } from '../utils/logger'; // Import logger

export const signup: RequestHandler = async (req, res) => {
  try {
    const { phone, password, name } = req.body;
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
    const user = new User({ phone, password, name });
    // Lưu ý: Ở đây bạn nên băm mật khẩu trước khi lưu.
    // logger.info('Hashing password for user', { phone: user.phone }); // Ví dụ log băm
    await user.save();
    logger.info('Signup successful', { userId: user._id, phone, name }); // Log thông tin thành công
    // Sử dụng user._id thay vì user.id nếu schema Mongoose trả về _id
    res.status(201).json({ message: 'Signup successful', user: { id: user._id, phone, name } });
  } catch (err) {
    // Log lỗi server với logger.error, bao gồm đối tượng lỗi và ngữ cảnh request body
    logger.error('Signup failed with server error', err, { requestBody: req.body });
    res.status(500).json({ error: 'Server error (signup)' });
  }
};

export const login: RequestHandler = async (req, res) => { // Áp dụng RequestHandler
  try {
    const { phone, password } = req.body;
    logger.info('Login attempt', { phone }); // Log thông tin
    if (!phone || !password) {
      logger.warn('Login failed - Missing credentials', { missingFields: { phone: !phone, password: !password }, requestBody: req.body }); // Log cảnh báo
      res.status(400).json({ error: 'Missing info' });
      return;
    }
    const user = await User.findOne({ phone });
    // Lưu ý: So sánh mật khẩu không băm là KHÔNG AN TOÀN! Hãy so sánh với mật khẩu đã băm.
    if (!user || user.password !== password) {
       logger.warn('Login failed - Invalid phone or password', { phone }); // Log cảnh báo
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }
    logger.info('Login successful', { userId: user._id, phone: user.phone, name: user.name }); // Log thông tin thành công
     // Sử dụng user._id thay vì user.id
    res.json({ id: user._id, name: user.name, phone: user.phone });
  } catch (err) {
    // Log lỗi server với logger.error
    logger.error('Login failed with server error', err, { requestBody: req.body });
    res.status(500).json({ error: 'Server error (login)' });
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