import prisma from "../database/postgresql.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { JWT_EXPIRY, JWT_SECRET, NODE_ENV, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRY, FRONTEND_URL } from "../config/env.js";
import { sendEmail } from "../config/nodemailer.js";
import { getWelcomeEmailTemplate, getForgotPasswordEmailTemplate, getVerificationEmailTemplate } from "../utils/emailTemplates.js";
import logger from "../utils/logger.js";
import { AppError, NotFoundError, UnauthorizedError, ValidationError, UnauthenticatedError } from "../utils/errors.js";

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
    return { accessToken, refreshToken };
};

export const signUp = async (req, res, next) => {
    try {
        const {name, email, password} = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ValidationError("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

        const created = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                verificationOTP: otp,
                verificationOTPExpires: otpExpires
            }
        });

        const tokens = generateTokens(created.id);
        await prisma.user.update({
            where: { id: created.id },
            data: { refreshToken: tokens.refreshToken }
        });

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
            logger.warn('Failed to send verification email', { email, message: emailError.message });
        }

        const { password: _p, refreshToken: _r, verificationOTP: _o, verificationOTPExpires: _e, ...safeUser } = created;

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
                user: safeUser,
                accessToken: tokens.accessToken
            }
        });

    } catch (error) {
        next(error);
    }
}

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const userId = req.user?.id || req.user?._id?.toString();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        
        const isMatch = user && user.password ? await bcrypt.compare(currentPassword, user.password) : false;
        if (!isMatch) {
            throw new UnauthenticatedError('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const signIn = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });

        // Compare even when user not found to prevent timing attacks
        const isMatch = existingUser?.password
            ? await bcrypt.compare(password, existingUser.password)
            : false;

        // Use a single generic message to prevent email enumeration
        if (!existingUser || !isMatch) {
            throw new UnauthenticatedError("Invalid email or password");
        }

        if (!existingUser.isVerified) {
            throw new UnauthenticatedError("Please verify your email before signing in");
        }

        const tokens = generateTokens(existingUser.id);
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { refreshToken: tokens.refreshToken }
        });

        const { password: _p, refreshToken: _r, ...safeUser } = existingUser;

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
                user: safeUser,
                accessToken: tokens.accessToken
            }
        });
        
    } catch (error) {
        next(error);
    }
}

export const signOut = async (req, res, next) => {
   try {
    const refreshToken = req.cookies.refreshToken;

    // Invalidate the refresh token in the database to prevent reuse after sign-out
    if (refreshToken) {
        try {
            await prisma.user.updateMany({
                where: { refreshToken },
                data: { refreshToken: null }
            });
        } catch (dbError) {
            logger.warn('Could not clear refresh token from DB on sign-out', { message: dbError.message });
        }
    }

    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: 'strict',
        secure: NODE_ENV === "production"
    });

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
            throw new UnauthenticatedError('Refresh token not found');
        }

        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

        if (!user || user.refreshToken !== refreshToken) {
            throw new UnauthenticatedError('Invalid refresh token');
        }

        const tokens = generateTokens(user.id);
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken }
        });

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
        const email = req.user.email;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: req.user.name,
                    email: req.user.email,
                    googleId: req.user.googleId || req.user.id,
                    isVerified: true
                }
            });
        } else {
            // update() returns the updated record — no need for a second findUnique
            user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: req.user.googleId || req.user.id, isVerified: true }
            });
        }
        const tokens = generateTokens(user.id);
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userData = JSON.stringify({
            _id: user.id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        });

        // Default to /account for a smoother dashboard transition
        const redirectTo = req.query.redirect_to || `${FRONTEND_URL}/account`;
        const separator = redirectTo.includes('?') ? '&' : '?';
        
        res.redirect(`${redirectTo}${separator}mode=social-success&token=${tokens.accessToken}&user=${encodeURIComponent(userData)}`);
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        // Always return success regardless — prevents email enumeration attacks
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account with this email exists, a password reset link has been sent."
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: new Date(Date.now() + 3600000)
            }
        });

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
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpires: null
                }
            });
            
            throw new AppError("Email could not be sent", 500);
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

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { gt: new Date() }
            }
        });

        if (!user) {
            throw new ValidationError("Invalid or expired reset token");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

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

        const user = await prisma.user.findFirst({
            where: {
                email,
                verificationOTP: otp,
                verificationOTPExpires: { gt: new Date() }
            }
        });

        if (!user) {
            throw new ValidationError("Invalid or expired verification code");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isVerified: true,
                verificationOTP: null,
                verificationOTPExpires: null
            }
        });

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
            logger.warn('Failed to send welcome email', { email: user.email, message: emailError.message });
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
        const email = req.user.email || `${req.user.username}@github.com`;
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    name: req.user.name || req.user.username,
                    email,
                    githubId: req.user.githubId || req.user.id,
                    isVerified: true
                }
            });
        } else {
            // update() returns the updated record — no need for a second findUnique
            user = await prisma.user.update({
                where: { id: user.id },
                data: { githubId: req.user.githubId || req.user.id, isVerified: true }
            });
        }
        const tokens = generateTokens(user.id);
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userData = JSON.stringify({
            _id: user.id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified
        });

        // Default to /account for a smoother dashboard transition
        const redirectTo = req.query.redirect_to || `${FRONTEND_URL}/account`;
        const separator = redirectTo.includes('?') ? '&' : '?';

        res.redirect(`${redirectTo}${separator}mode=social-success&token=${tokens.accessToken}&user=${encodeURIComponent(userData)}`);
    } catch (error) {
        next(error);
    }
};
