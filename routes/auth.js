import { Router } from "express";
import { forgotPassword, login, signUp } from "../controllers/auth.js";

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/signup", signUp);
authRoutes.post("/forgotpassword", forgotPassword);

export default authRoutes;
