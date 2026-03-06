import { Router } from "express";
import prisma from "../database/postgresql.js";

const statsRouter = Router();

statsRouter.get("/", async (req, res, next) => {
    try {
        const [usersCount, shopsCount, productsCount] = await Promise.all([
            prisma.user.count(),
            prisma.shop.count(),
            prisma.product.count()
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
