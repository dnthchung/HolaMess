# HolaMess - Real-time Chat Application

HolaMess is a full-stack real-time chat application designed to enable users to register, log in, find other users, and engage in private conversations. It features real-time message delivery, online status indicators, read receipts, and a history of recent conversations.

## Project Description

HolaMess provides a seamless chatting experience with the following core functionalities:

* **User Authentication:** Secure user registration (signup) and login using phone numbers and passwords. Authentication is managed via JSON Web Tokens (JWT) with access and refresh token mechanisms for enhanced security and session management.
* **User Discovery:** Users can view a list of other registered users to initiate conversations.
* **Real-time Private Messaging:** Instantaneous message exchange between two users using Socket.IO for WebSocket communication.
* **Chat Interface:** A user-friendly interface displaying the conversation with a selected user, including message history and the ability to send new messages.
* **Online Status:** Users can see if other users are currently online.
* **Read Receipts:** Senders can see if their messages have been read by the recipient.
* **Recent Conversations:** Users can easily access their recent chat history, sorted by the latest message.
* **Multi-device Synchronization:** Session management and socket handling are designed to support users being logged in on multiple devices, with real-time updates (e.g., read status) synchronized across them.
* **Responsive UI:** The frontend is built with Tailwind CSS for a modern and responsive user experience.

The project is structured into two main parts:
* `be/`: The backend server built with Node.js, Express, and MongoDB.
* `fe/`: The frontend client built with React, Vite, and TypeScript.

## Tech Stack

### Backend (Directory: `be/`)

* **Runtime Environment:** Node.js
* **Framework:** Express.js
* **Language:** TypeScript
* **Database:** MongoDB (with Mongoose as ODM)
* **Real-time Communication:** Socket.IO
* **Authentication:**
    * JSON Web Tokens (JWT) (`jsonwebtoken`, `express-jwt`)
    * Password Hashing: `bcrypt`
* **API & Middleware:**
    * `cors`: For Cross-Origin Resource Sharing
    * `helmet`: For securing HTTP headers
    * `cookie-parser`: For parsing cookies (used for refresh tokens)
    * `dotenv`: For managing environment variables
* **Logging:** `winston` and `winston-daily-rotate-file` for structured and rotating logs.
* **Development:**
    * `nodemon`: For automatic server restarts during development.
    * `ts-node`: For executing TypeScript files directly.
    * `typescript`: For static typing.

### Frontend (Directory: `fe/`)

* **Framework/Library:** React
* **Language:** TypeScript
* **Build Tool & Dev Server:** Vite
* **Routing:** React Router (`react-router-dom`)
* **State Management:** React Context API (`UserContext` for user session, `SocketContext` for WebSocket connection management)
* **HTTP Client:** Axios (with interceptors for token management and refresh logic)
* **Real-time Communication:** Socket.IO Client (`socket.io-client`)
* **Styling:** Tailwind CSS
* **Linting:** ESLint
* **Development:**
    * `typescript`: For static typing.

## Setup and Installation (Example - Further details would be in specific READMEs for `be` and `fe`)

**Prerequisites:**
* Node.js and npm/yarn
* MongoDB instance running

**Backend (`be/`):**
1.  Navigate to the `be/` directory.
2.  Create a `.env` file based on `.env.example` and fill in your environment variables (MongoDB URI, JWT secrets, etc.).
3.  Install dependencies: `npm install` (or `yarn install`)
4.  Build TypeScript: `npm run build`
5.  Start the server: `npm start`
6.  For development with auto-reload: `npm run dev`

**Frontend (`fe/`):**
1.  Navigate to the `fe/` directory.
2.  Create a `.env` or `.env.local` file if needed to override `VITE_API_URL` (defaults to `http://localhost:3000`).
3.  Install dependencies: `npm install` (or `yarn install`)
4.  Start the development server: `npm run dev`
5.  To build for production: `npm run build`

## API Endpoints Overview (Backend)

* **Authentication (`/api/auth`):**
    * `POST /signup`: User registration.
    * `POST /login`: User login.
    * `POST /logout`: User logout (requires auth token).
    * `POST /refresh-token`: Refresh access token using refresh token (sent via HTTP-only cookie).
    * `POST /revoke-all`: Revoke all tokens and sessions for the authenticated user.
    * `GET /users`: Get a list of users (requires auth token).
    * `GET /sessions`: Get active sessions for the authenticated user.
    * `DELETE /sessions/:sessionId`: Terminate a specific user session.
* **Messages (`/api/messages`):** (All require auth token)
    * `GET /conversation/:userId/:otherUserId`: Get message history between two users.
    * `PUT /mark-read/:userId/:otherUserId`: Mark messages from `otherUserId` to `userId` as read.
    * `PUT /mark-read-focus/:userId/:otherUserId`: Mark messages as read when user focuses on input.
    * `GET /recent/:userId`: Get recent conversations for a user.

## Socket.IO Events Overview

* **Connection:** `connection`
* **Authentication:** `authenticate` (client sends token, server validates)
* **User Joining (Legacy):** `join`
* **Online Status:**
    * `get_online_users` (client requests, server responds with list)
    * `user_online` (server broadcasts when a user connects/authenticates)
    * `user_offline` (server broadcasts when a user disconnects)
* **Private Messaging:**
    * `private_message` (client sends, server relays to recipient and saves to DB, confirms to sender)
* **Typing Indicators:**
    * `typing` (client sends, server relays to recipient)
* **Read Receipts:**
    * `mark_read` (client sends when messages are read, server updates DB and notifies sender via `receipt_read`)
    * `receipt_read` (server sends to original sender when their messages are read by recipient)
    * `messages_read` (server sends to user's other devices when messages are read on one device)
* **Device Sync:**
    * `device_connected` (server notifies user's other devices when a new device connects)
    * `device_disconnected` (server notifies user's other devices when a device disconnects)
* **Error Handling:**
    * `auth_error` (server sends if socket operation authentication fails)
    * `token_expired` (server sends if token is expired, client should logout)
    * `error_message` (generic error messages from server to client)
* **Disconnection:** `disconnect`

---

This README provides a comprehensive overview. You might want to split parts of the "Setup and Installation" and more detailed API/Socket event documentation into separate README files within the `be/` and `fe/` directories respectively for better organization.
