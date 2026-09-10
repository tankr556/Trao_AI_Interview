import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email and password are required.' } });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: { code: 'USER_EXISTS', message: 'User with this email already exists.' } });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new UserModel({
      email: email.toLowerCase(),
      passwordHash,
      name
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email and password are required.' } });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name }
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
    }
    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

export const authRouter = router;
