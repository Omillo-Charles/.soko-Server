import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { JWT_EXPIRY, JWT_SECRET } from "../config/env.js";

export const signUp = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {name, email, password} = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Missing details"
            })
        };

        const existingUser = await User.findOne({email});
        if (existingUser) {
            const error = new Error("User already exists");
            error.statusCode = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({name, email, password: hashedPassword});

        const token = jwt.sign({userId: newUser._id}, JWT_SECRET, {expiresIn: JWT_EXPIRY});

       await session.commitTransaction();
       session.endSession();

        console.log("User created succesfully!");

       res.status(201).json({
        success: true,
        message: "User signed up successfully!",
        data: {
            newUser,
            token
        }
       });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log("Error signing up: ", error);
    }
}

export const signIn = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            const error = new Error("Missing details");
            error.statusCode = 400;
            throw error;
        };

        const existingUser = await User.findOne({email});
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

        const token = jwt.sign({userId: existingUser._id}, JWT_SECRET, {expiresIn: JWT_EXPIRY});

        res.status(200).json({
            success: true,
            message: "User signed in successfully!",
            data: {
                existingUser,
                token
            }
        });
        
    } catch (error) {
        console.log("Error signing in: ", error);
    }
}

export const signOut = async (req, res) => {
   try {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: true,
        secure: NODE_ENV === "production"
    })

    res.status(200).json({
        success: true,
        message: "User signed out successfully!"
    });
    
   } catch (error) {
    console.log("Error logging out: ", error)
   }
}