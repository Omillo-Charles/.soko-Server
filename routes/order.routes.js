import { Router } from "express";
import { createOrder, getMyOrders, getOrderById, getSellerOrders, updateOrderStatus, trackOrder } from "../controllers/order.controller.js";
import authorize from "../middlewares/auth.middleware.js";

const orderRouter = Router();

orderRouter.get("/track/:id", trackOrder);
orderRouter.post("/", authorize, createOrder);
orderRouter.get("/my-orders", authorize, getMyOrders);
orderRouter.get("/seller", authorize, getSellerOrders);
orderRouter.get("/:id", authorize, getOrderById);
orderRouter.patch("/:id/status", authorize, updateOrderStatus);

export default orderRouter;
