import { Router } from "express";
import { getWishlist, toggleWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const wishlistRouter = Router();

wishlistRouter.get("/", authorize, getWishlist);
wishlistRouter.post("/toggle", authorize, toggleWishlist);
wishlistRouter.delete("/:productId", authorize, removeFromWishlist);

export default wishlistRouter;
