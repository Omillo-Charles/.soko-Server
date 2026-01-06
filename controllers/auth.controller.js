import { userConnection } from "../database/mongodb.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { JWT_EXPIRY, JWT_SECRET, NODE_ENV, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRY, FRONTEND_URL } from "../config/env.js";
import { sendEmail } from "../config/nodemailer.js";

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
    return { accessToken, refreshToken };
};

export const signUp = async (req, res, next) => {
    const session = await userConnection.startSession();
    session.startTransaction();

    try {
        const {name, email, password} = req.body;

        const existingUser = await User.findOne({email});
        if (existingUser) {
            const error = new Error("User already exists");
            error.statusCode = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { accessToken, refreshToken } = generateTokens('temp-id'); // We'll update this after creation

        const newUsers = await User.create([{ name, email, password: hashedPassword, refreshToken }], { session });

        const tokens = generateTokens(newUsers[0]._id);
        newUsers[0].refreshToken = tokens.refreshToken;
        await newUsers[0].save({ session });

        await session.commitTransaction();
        session.endSession();

        // Send Welcome Email
        try {
            await sendEmail({
                to: email,
                subject: 'Welcome to Duuka!',
                text: `Hi ${name}, welcome to Duuka! We are glad to have you on board.`,
                html: `<h1>Welcome to Duuka!</h1><p>Hi ${name},</p><p>We are glad to have you on board. Start exploring our platform now!</p>`
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // We don't throw here to avoid failing the signup process if email fails
        }

        newUsers[0].password = undefined;
        newUsers[0].refreshToken = undefined;

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({
            success: true,
            message: "User signed up successfully!",
            data: {
                user: newUsers[0],
                accessToken: tokens.accessToken
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
}

export const signIn = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        const existingUser = await User.findOne({email}).select('+password');
        if (!existingUser) {
            const error = new Error("User does not exist");
            error.statusCode = 404;
            throw error;
        }

        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            const error = new Error("Incorrect password");
            error.statusCode = 400;
            throw error;
        }

        const tokens = generateTokens(existingUser._id);
        existingUser.refreshToken = tokens.refreshToken;
        await existingUser.save();

        existingUser.password = undefined;
        existingUser.refreshToken = undefined;

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            message: "User signed in successfully!",
            data: {
                user: existingUser,
                accessToken: tokens.accessToken
            }
        });
        
    } catch (error) {
        next(error);
    }
}

export const signOut = async (req, res, next) => {
   try {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: 'strict',
        secure: NODE_ENV === "production"
    })

    res.status(200).json({
        success: true,
        message: "User signed out successfully!"
    });
    
   } catch (error) {
    next(error);
   }
}

export const refresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            const error = new Error('Refresh token not found');
            error.statusCode = 401;
            throw error;
        }

        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.userId).select('+refreshToken');

        if (!user || user.refreshToken !== refreshToken) {
            const error = new Error('Invalid refresh token');
            error.statusCode = 401;
            throw error;
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(200).json({
            success: true,
            accessToken: tokens.accessToken
        });
    } catch (error) {
        next(error);
    }
};

export const googleAuthSuccess = async (req, res, next) => {
    try {
        const tokens = generateTokens(req.user._id);
        req.user.refreshToken = tokens.refreshToken;
        await req.user.save();

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // Redirect to frontend with access token
        res.redirect(`${FRONTEND_URL}/auth-success?token=${tokens.accessToken}`);
    } catch (error) {
        next(error);
    }
};

export const githubAuthSuccess = async (req, res, next) => {
    try {
        const tokens = generateTokens(req.user._id);
        req.user.refreshToken = tokens.refreshToken;
        await req.user.save();

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect(`${FRONTEND_URL}/auth-success?token=${tokens.accessToken}`);
    } catch (error) {
        next(error);
    }
};