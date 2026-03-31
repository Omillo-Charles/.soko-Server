import { Router } from "express";
import { getWishlist, toggleWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { toggleWishlistSchema } from "../validations/wishlist.validation.js";

const wishlistRouter = Router();

wishlistRouter.get("/", authorize, getWishlist);
wishlistRouter.post("/toggle", authorize, validate(toggleWishlistSchema), toggleWishlist);
wishlistRouter.delete("/:productId", authorize, removeFromWishlist);

export default wishlistRouter;
