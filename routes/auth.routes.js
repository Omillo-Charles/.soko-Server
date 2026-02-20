import { Router } from "express";
import { signIn, signOut, signUp, refresh, googleAuthSuccess, githubAuthSuccess, forgotPassword, resetPassword, verifyEmail, changePassword } from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { signInSchema, signUpSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "../validations/auth.validation.js";
import passport from "passport";
import { FRONTEND_URL } from "../config/env.js";
import authorize from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/limit.middleware.js";

const authRouter = Router();

authRouter.post("/sign-up", authLimiter, validate(signUpSchema), signUp);
authRouter.post("/verify-email", authLimiter, validate(verifyEmailSchema), verifyEmail);
authRouter.post("/sign-in", authLimiter, validate(signInSchema), signIn);
authRouter.post("/sign-out", signOut);
authRouter.post("/refresh", refresh);
authRouter.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password/:token", authLimiter, validate(resetPasswordSchema), resetPassword);
authRouter.post("/change-password", authorize, authLimiter, changePassword);

// Google Auth Routes
authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.redirect(`${FRONTEND_URL}/auth?mode=login&error=${encodeURIComponent(err?.message || "Google authentication failed")}`);
        }
        req.user = user;
        googleAuthSuccess(req, res, next);
    })(req, res, next);
});

// GitHub Auth Routes
authRouter.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
authRouter.get("/github/callback", (req, res, next) => {
    passport.authenticate("github", { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.redirect(`${FRONTEND_URL}/auth?mode=login&error=${encodeURIComponent(err?.message || "GitHub authentication failed")}`);
        }
        req.user = user;
        githubAuthSuccess(req, res, next);
    })(req, res, next);
});

export default authRouter;