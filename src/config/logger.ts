import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Winston Logger Configuration
 * 
 * מערכת לוגים מתקדמת עם:
 * - רמות לוג שונות
 * - קבצים מתחלפים יומית
 * - פורמט מותאם
 */

// רמות לוג מותאמות אישית
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
    }
};

// פורמט לוג
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }

        return msg;
    })
);

// פורמט לקונסול (צבעוני)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} ${level}: ${message}`;

        if (Object.keys(metadata).length > 0 && process.env.NODE_ENV === 'development') {
            msg += `\n${JSON.stringify(metadata, null, 2)}`;
        }

        return msg;
    })
);

// יצירת תיקיית logs
const logsDir = path.join(process.cwd(), 'logs');

// Transport לקבצים מתחלפים - שגיאות
const errorFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d', // שמור 14 ימים
    format: logFormat,
});

// Transport לקבצים מתחלפים - כל הלוגים
const combinedFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d', // שמור 7 ימים
    format: logFormat,
});

// יצירת Logger
const logger = winston.createLogger({
    levels: customLevels.levels,
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        errorFileTransport,
        combinedFileTransport,
    ],
    // טיפול בשגיאות לא תפוסות
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: logFormat,
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: logFormat,
        })
    ],
});

// הוספת console transport בפיתוח
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug',
    }));
}

// הוספת צבעים
winston.addColors(customLevels.colors);

// פונקציות עזר ללוגים
export const loggers = {
    // לוג כללי
    info: (message: string, metadata?: any) => logger.info(message, metadata),
    warn: (message: string, metadata?: any) => logger.warn(message, metadata),
    error: (message: string, error?: Error | any, metadata?: any) => {
        if (error instanceof Error) {
            logger.error(message, { error: error.message, stack: error.stack, ...metadata });
        } else {
            logger.error(message, { error, ...metadata });
        }
    },
    debug: (message: string, metadata?: any) => logger.debug(message, metadata),
    http: (message: string, metadata?: any) => logger.http(message, metadata),

    // לוגים ספציפיים
    auth: {
        login: (email: string, success: boolean, metadata?: any) => {
            logger.info(`Login attempt: ${email}`, { email, success, type: 'auth', ...metadata });
        },
        register: (email: string, success: boolean, metadata?: any) => {
            logger.info(`Registration: ${email}`, { email, success, type: 'auth', ...metadata });
        },
    },

    story: {
        generated: (userId: number, storyId: number, duration: number) => {
            logger.info('Story generated', { userId, storyId, duration, type: 'story' });
        },
        failed: (userId: number, error: string) => {
            logger.error('Story generation failed', { userId, error, type: 'story' });
        },
    },

    queue: {
        jobStarted: (jobId: string, type: string) => {
            logger.info('Queue job started', { jobId, type, event: 'job_start' });
        },
        jobCompleted: (jobId: string, type: string, duration: number) => {
            logger.info('Queue job completed', { jobId, type, duration, event: 'job_complete' });
        },
        jobFailed: (jobId: string, type: string, error: string) => {
            logger.error('Queue job failed', { jobId, type, error, event: 'job_failed' });
        },
    },

    cache: {
        hit: (key: string) => {
            logger.debug('Cache hit', { key, type: 'cache', event: 'hit' });
        },
        miss: (key: string) => {
            logger.debug('Cache miss', { key, type: 'cache', event: 'miss' });
        },
        error: (key: string, error: string) => {
            logger.error('Cache error', { key, error, type: 'cache' });
        },
    },
};

// Stream לintegration עם Morgan
export const morganStream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

export default logger;