import { Router } from "express";
import { signIn, signOut, signUp, refresh, googleAuthSuccess, githubAuthSuccess, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema } from "../validations/auth.validation.js";
import passport from "passport";

const authRouter = Router();

authRouter.post("/sign-up", validate(signUpSchema), signUp);
authRouter.post("/sign-in", validate(signInSchema), signIn);
authRouter.post("/sign-out", signOut);
authRouter.post("/refresh", refresh);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password/:token", validate(resetPasswordSchema), resetPassword);

// Google Auth Routes
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", passport.authenticate("google", { session: false }), googleAuthSuccess);

// GitHub Auth Routes
authRouter.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
authRouter.get("/github/callback", passport.authenticate("github", { session: false }), githubAuthSuccess);

export default authRouter;