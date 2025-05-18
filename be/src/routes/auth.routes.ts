// src/routes/auth.routes.ts
import express from "express";
import { signup, login, getUsers } from "../controllers/auth.controller";

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);
router.get("/users", getUsers);

export default router;