import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import limiter from "./middlewares/limit.middleware.js";
import { PORT, FRONTEND_URL } from "./config/env.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import contactRouter from "./routes/contact.routes.js";
import shopRouter from "./routes/shop.routes.js";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import statsRouter from "./routes/stats.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import passport from "./config/passport.js";

const app = express();

app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(passport.initialize());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/contacts", contactRouter);
app.use("/api/v1/shops", shopRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/carts", cartRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/stats", statsRouter);

app.use(errorMiddleware);

app.get("/", (req, res)=>{
  res.send({
    title: "Duuka Backend API",
    body: "Welcome to the Duuka Backend API"
  });

})

app.listen(PORT, async ()=>{
  console.log(`The Duuka Backend API is running on http://localhost:${PORT}`);
});

export default app;