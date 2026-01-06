import { userConnection } from "../database/mongodb.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import { JWT_EXPIRY, JWT_SECRET, NODE_ENV, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRY, FRONTEND_URL } from "../config/env.js";
import { sendEmail } from "../config/nodemailer.js";
import { getWelcomeEmailTemplate, getForgotPasswordEmailTemplate, getVerificationEmailTemplate } from "../utils/emailTemplates.js";

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

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

        const { accessToken, refreshToken } = generateTokens('temp-id'); // We'll update this after creation

        const newUsers = await User.create([{ 
            name, 
            email, 
            password: hashedPassword, 
            refreshToken,
            verificationOTP: otp,
            verificationOTPExpires: otpExpires
        }], { session });

        const tokens = generateTokens(newUsers[0]._id);
        newUsers[0].refreshToken = tokens.refreshToken;
        await newUsers[0].save({ session });

        await session.commitTransaction();
        session.endSession();

        // Send Verification Email
        try {
            const template = getVerificationEmailTemplate(name, otp);
            await sendEmail({
                to: email,
                subject: template.subject,
                text: template.text,
                html: template.html
            });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
        }

        newUsers[0].password = undefined;
        newUsers[0].refreshToken = undefined;
        newUsers[0].verificationOTP = undefined;
        newUsers[0].verificationOTPExpires = undefined;

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

        if (!existingUser.isVerified) {
            const error = new Error("Please verify your email before signing in");
            error.statusCode = 401;
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

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            const error = new Error("User with this email does not exist");
            error.statusCode = 404;
            throw error;
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
        const template = getForgotPasswordEmailTemplate(user.name, resetUrl);

        try {
            await sendEmail({
                to: email,
                subject: template.subject,
                text: template.text,
                html: template.html
            });

            res.status(200).json({
                success: true,
                message: "Password reset link sent to your email"
            });
        } catch (emailError) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            const error = new Error("Email could not be sent");
            error.statusCode = 500;
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) {
            const error = new Error("Invalid or expired reset token");
            error.statusCode = 400;
            throw error;
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ 
            email,
            verificationOTP: otp,
            verificationOTPExpires: { $gt: Date.now() }
        }).select('+verificationOTP +verificationOTPExpires');

        if (!user) {
            const error = new Error("Invalid or expired verification code");
            error.statusCode = 400;
            throw error;
        }

        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationOTPExpires = undefined;
        await user.save();

        // Send Welcome Email after successful verification
        try {
            const template = getWelcomeEmailTemplate(user.name);
            await sendEmail({
                to: user.email,
                subject: template.subject,
                text: template.text,
                html: template.html
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
        }

        res.status(200).json({
            success: true,
            message: "Email verified successfully! You can now sign in."
        });
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