import { Router } from "express";
import { createProduct, getProducts, getProductById, getMyProducts, updateProduct, deleteProduct, getProductsByShopId, rateProduct, getPersonalizedFeed, trackActivity } from "../controllers/product.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import { upload } from "../config/cloudinary.js";

const productRouter = Router();

// Feed and Tracking
productRouter.get("/feed", (req, res, next) => {
    if (req.headers.authorization) {
        return authorize(req, res, next);
    }
    next();
}, getPersonalizedFeed);
productRouter.post("/track", (req, res, next) => {
    if (req.headers.authorization) {
        return authorize(req, res, next);
    }
    next();
}, trackActivity);

productRouter.post("/", authorize, upload.array('image', 3), createProduct);
productRouter.post("/:id/rate", authorize, rateProduct);
productRouter.get("/", getProducts);
productRouter.get("/shop/:id", getProductsByShopId);
productRouter.get("/my-products", authorize, getMyProducts);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", authorize, upload.array('image', 3), updateProduct);
productRouter.delete("/:id", authorize, deleteProduct);

export default productRouter;
