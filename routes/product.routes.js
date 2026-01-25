import { Router } from "express";
import { createProduct, getProducts, getProductById, getMyProducts, updateProduct, deleteProduct, getProductsByShopId, rateProduct } from "../controllers/product.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import { upload } from "../config/cloudinary.js";

const productRouter = Router();

productRouter.post("/", authorize, upload.single('image'), createProduct);
productRouter.post("/:id/rate", authorize, rateProduct);
productRouter.get("/", getProducts);
productRouter.get("/shop/:id", getProductsByShopId);
productRouter.get("/my-products", authorize, getMyProducts);
productRouter.get("/:id", getProductById);
productRouter.put("/:id", authorize, upload.single('image'), updateProduct);
productRouter.delete("/:id", authorize, deleteProduct);

export default productRouter;
