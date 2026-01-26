import { Router } from "express";
import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";

const statsRouter = Router();

statsRouter.get("/", async (req, res, next) => {
    try {
        const [usersCount, shopsCount, productsCount] = await Promise.all([
            User.countDocuments(),
            Shop.countDocuments(),
            Product.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data: {
                users: usersCount,
                shops: shopsCount,
                products: productsCount
            }
        });
    } catch (error) {
        next(error);
    }
});

export default statsRouter;
