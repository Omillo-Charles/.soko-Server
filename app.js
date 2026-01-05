import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import limiter from "./middlewares/limit.middleware.js";
import { PORT } from "./config/env.js";
import connectToDB from "./database/mongodb.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

app.use(errorMiddleware);

app.get("/", (req, res)=>{
  res.send({
    title: "Duuka Backend API",
    body: "Welcome to the Duuka Backend API"
  });

})
app.listen(PORT, async ()=>{
  console.log(`The Duuka Backend API is running on http://localhost:${PORT}`);
  await connectToDB();
});

export default app;