import jwt from 'jsonwebtoken';
import prisma from '../database/postgresql.js';
import { JWT_SECRET } from '../config/env.js';
import { UnauthenticatedError } from '../utils/errors.js';

const authorize = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new UnauthenticatedError('Unauthorized');
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                accountType: true,
                isVerified: true,
                isPremium: true,
                premiumPlan: true,
                premiumUntil: true
            }
        });

        if (!user) {
            throw new UnauthenticatedError('Unauthorized');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export const extractUserIdFromToken = (req) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        return null;
    }
};

export default authorize;
