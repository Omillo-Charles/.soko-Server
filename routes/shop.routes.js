import { Router } from "express";
import { createShop, getMyShop, getShopById, updateShop, deleteShop, getShops } from "../controllers/shop.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import { upload } from "../config/cloudinary.js";

const shopRouter = Router();

shopRouter.get("/", getShops);
shopRouter.post("/", authorize, createShop);
shopRouter.get("/my-shop", authorize, getMyShop);
shopRouter.get("/:id", getShopById);
shopRouter.put("/my-shop", authorize, updateShop);
shopRouter.put("/my-shop/branding", authorize, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), updateShop);
shopRouter.delete("/my-shop", authorize, deleteShop);

export default shopRouter;
