import { Router } from "express";
import { getUser, getUsers, updateAccountType, getCurrentUser, deleteAccount, getUserFollowing, getUserFollowers } from "../controllers/user.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/me", authorize, getCurrentUser);
userRouter.delete("/me", authorize, deleteAccount);
userRouter.get("/", authorize, getUsers);
userRouter.get("/following/:id", authorize, getUserFollowing);
userRouter.get("/followers/:id", authorize, getUserFollowers);
userRouter.get("/:id", authorize, getUser);
userRouter.put("/update-account-type", authorize, updateAccountType);

export default userRouter;
