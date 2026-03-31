import { Router } from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from "../controllers/cart.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { addToCartSchema, updateCartItemSchema } from "../validations/cart.validation.js";

const cartRouter = Router();

cartRouter.get("/", authorize, getCart);
cartRouter.post("/add", authorize, validate(addToCartSchema), addToCart);
cartRouter.put("/item/:itemId", authorize, validate(updateCartItemSchema), updateCartItem);
cartRouter.delete("/item/:itemId", authorize, removeFromCart);
cartRouter.delete("/clear", authorize, clearCart);

export default cartRouter;
