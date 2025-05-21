import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import config from "./config";
import { logger } from "./utils/logger";

// Socket handlers
import setupSocketHandlers from "./socket/handlers";

// Routes
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";

// Application constants
const { PORT, MONGODB_URI, NODE_ENV, CORS_ORIGIN, COOKIE_SECRET } = config;

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET)); // Parse cookies

// API request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Create HTTP server and Socket.io instance
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true, // Allow cookies with socket connections
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
});

// Set up socket handlers
const socketHandlers = setupSocketHandlers(io);

// Share socket.io instance with message controller for cross-device sync
import { setSocketInstance } from "./controllers/message.controller";
setSocketInstance(io);

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("✅ MongoDB connected successfully");
  } catch (error) {
    logger.error("❌ MongoDB connection error", error);
    logger.info("Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error("Unhandled error", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${PORT} is already in use. Trying port ${Number(PORT) + 1}...`);
    // Try the next port
    server.listen(Number(PORT) + 1, () => {
      const actualPort = (server.address() as any).port;
      logger.info(`🚀 Server running in ${NODE_ENV} mode on http://localhost:${actualPort}`);
    });
  } else {
    logger.error('Server failed to start:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close()
      .then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      })
      .catch(err => {
        logger.error('Error closing MongoDB connection', err);
        process.exit(1);
      });
  });
});
