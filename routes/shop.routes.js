import { Router } from "express";
import { createShop, getMyShop, getShopById } from "../controllers/shop.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const shopRouter = Router();

shopRouter.post("/", authorize, createShop);
shopRouter.get("/my-shop", authorize, getMyShop);
shopRouter.get("/:id", getShopById);

export default shopRouter;
