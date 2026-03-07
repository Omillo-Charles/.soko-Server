import { Router } from "express";
import { createComment, getProductComments, deleteComment } from "../controllers/comment.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const commentRouter = Router();

commentRouter.post("/", authorize, createComment);
commentRouter.get("/product/:productId", getProductComments);
commentRouter.delete("/:id", authorize, deleteComment);

export default commentRouter;
