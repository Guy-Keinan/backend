import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import routes from './routes';
import { initializeQueues, closeQueues } from './queues';
import { startStoryWorker, stopStoryWorker } from './queues/workers/storyWorker';
import { generalLimiter } from './config/rateLimiter';
import { bullBoardRouter } from './config/bullBoard';
import { loggers, morganStream } from './config/logger';
import { rateLimitInfo } from './config/rateLimiter';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // אבטחה בסיסית
app.use(cors()); // מאפשר בקשות מדומיינים שונים
app.use(morgan('combined', { stream: morganStream }));

app.use('/admin/queues', bullBoardRouter);
app.use(rateLimitInfo);


// Rate Limiting כללי
app.use('/api', generalLimiter);

// הגדרות קידוד UTF-8 לתמיכה בעברית
app.use(express.json({
  limit: '10mb',
  type: 'application/json'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// הגדרת response headers לתמיכה בעברית
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// נתיב בסיסי לבדיקה
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Kids Story App API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: '/api',
      health: '/health'
    }
  });
});

// נתיב לבדיקת בריאות הסרבר
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// חיבור כל הנתיבים של ה-API
app.use('/api', routes);

// טיפול בשגיאות 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// טיפול בשגיאות כלליות
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// הפעלת הסרבר
const startServer = async () => {
  try {
    // חיבור לבסיס הנתונים דרך Prisma
    await connectDatabase();

    // חיבור לRedis
    await connectRedis();

    // אתחול BullMQ queues
    await initializeQueues();

    // הפעלת Workers
    startStoryWorker();

    app.listen(PORT, () => {
      loggers.info(`🚀 Server is running on port ${PORT}`);
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📖 Kids Story App API started at http://localhost:${PORT}`);
      console.log(`🐂 BullMQ workers are running`);
    });
  } catch (error) {
    loggers.error('Failed to start server', error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// טיפול בסגירת הסרבר
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down server...');

  // עצירת Workers
  await stopStoryWorker();

  // סגירת Queues
  await closeQueues();

  // ניתוק מבסיס הנתונים
  await disconnectDatabase();

  // ניתוק מRedis
  await disconnectRedis();

  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down server...');

  // עצירת Workers
  await stopStoryWorker();

  // סגירת Queues
  await closeQueues();

  // ניתוק מבסיס הנתונים
  await disconnectDatabase();

  // ניתוק מRedis
  await disconnectRedis();

  process.exit(0);
});

startServer();