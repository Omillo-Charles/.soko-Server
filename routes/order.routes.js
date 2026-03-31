import { Router } from "express";
import { createOrder, getMyOrders, getOrderById, getSellerOrders, updateOrderStatus, trackOrder } from "../controllers/order.controller.js";
import authorize from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createOrderSchema, updateOrderStatusSchema } from "../validations/order.validation.js";

const orderRouter = Router();

orderRouter.get("/track/:id", trackOrder);
orderRouter.post("/", authorize, validate(createOrderSchema), createOrder);
orderRouter.get("/my-orders", authorize, getMyOrders);
orderRouter.get("/seller", authorize, getSellerOrders);
orderRouter.get("/:id", authorize, getOrderById);
orderRouter.patch("/:id/status", authorize, validate(updateOrderStatusSchema), updateOrderStatus);

export default orderRouter;
