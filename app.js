import express from "express";
import { PORT } from "./config/env.js";
import connectToDB from "./database/mongodb.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use("/api/v1/auth", authRouter);

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