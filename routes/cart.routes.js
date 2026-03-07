import { Router } from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cart.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const cartRouter = Router();

cartRouter.get("/", authorize, getCart);
cartRouter.post("/add", authorize, addToCart);
cartRouter.put("/item/:itemId", authorize, updateCartItem);
cartRouter.delete("/item/:itemId", authorize, removeFromCart);
cartRouter.delete("/clear", authorize, clearCart);

export default cartRouter;
