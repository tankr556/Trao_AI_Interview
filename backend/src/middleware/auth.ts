import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' } });
  }

  const secret = process.env.JWT_SECRET || 'fallback_secret_key';

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Session expired or invalid token.' } });
    }
    req.user = user as { userId: string; email: string };
    next();
  });
};
