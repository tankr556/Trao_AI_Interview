import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth.js';
import { kitsRouter } from './routes/kits.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['https://trao-ai-interview-zekz-mu.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/kits', kitsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred.'
    }
  });
});

// Start Server & Connect MongoDB
async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trao_interview';
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');

    app.listen(PORT, () => {
      console.log(`Trao Backend API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
