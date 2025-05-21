import dotenv from "dotenv";
dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/holamess",
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  JWT_SECRET: process.env.JWT_SECRET || "your_jwt_secret_key",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "30s",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "your_refresh_token_secret_key",
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  REFRESH_TOKEN_COOKIE_MAXAGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_TOKEN_COOKIE_NAME: "refreshToken",
  COOKIE_SECRET: process.env.COOKIE_SECRET || "your_cookie_secret_key",
};

export default config;
