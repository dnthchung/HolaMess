import User from '../models/User';
import { RequestHandler } from 'express';

export const signup: RequestHandler = async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password || !name) {
      res.status(400).json({ error: 'Missing info' });
      return;
    }
    const exist = await User.findOne({ phone });
    if (exist) {
      res.status(409).json({ error: 'Phone exists' });
      return;
    }
    const user = new User({ phone, password, name });
    await user.save();
    res.status(201).json({ message: 'Signup successful', user: { _id: user._id, phone, name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error (signup)' });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.status(400).json({ error: 'Missing info' });
      return;
    }
    const user = await User.findOne({ phone });
    if (!user || user.password !== password) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }
    res.json({ _id: user._id, name: user.name, phone: user.phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error (login)' });
  }
};

export const getUsers: RequestHandler = async (req, res) => {
  try {
    const { exclude } = req.query;
    let filter = {};

    if (typeof exclude === 'string') {
      filter = { phone: { $ne: exclude } };
    }

    const users = await User.find(filter).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error (get users)' });
  }
};
