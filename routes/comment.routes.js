import { Router } from "express";
import { createComment, getProductComments, deleteComment } from "../controllers/comment.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createCommentSchema } from "../validations/comment.validation.js";
import { commentLimiter } from "../middlewares/limit.middleware.js";

const commentRouter = Router();

commentRouter.post("/", authorize, commentLimiter, validate(createCommentSchema), createComment);
commentRouter.get("/product/:productId", getProductComments);
commentRouter.delete("/:id", authorize, deleteComment);

export default commentRouter;
