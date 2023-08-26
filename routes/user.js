import { Router } from "express";
import { deleteUser, getUser, updateUser } from "../controllers/user.js";

const userRoutes = Router();

userRoutes.get("/", getUser);
userRoutes.put("/", updateUser);
userRoutes.delete("/", deleteUser);

export default userRoutes;
