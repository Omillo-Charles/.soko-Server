import { Router } from "express";
import { getUser, getUsers, updateAccountType } from "../controllers/user.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get("/", authorize, getUsers);
userRouter.get("/:id", authorize, getUser);
userRouter.put("/update-account-type", authorize, updateAccountType);

export default userRouter;
