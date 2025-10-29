import { Request, Response } from "express";
import { User } from "../models/user.model";
import { compareKey, hashKey } from "../utils/hash.utils";
import { generateToken } from "../utils/jwt.utils";
import { AuthenticatedRequest } from "../Types/authenticatedRequest.type";
import { log } from "console";

export const createUser = async (req: Request, res: Response) => {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    try {
        const hashedPassword = await hashKey(password);
        const user = await User.create({ name, username, email, password: hashedPassword });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not created" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(201).json({ success: true, user });
    } catch (error) {
        console.log(error);
        
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}; 

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await compareKey(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        return res.status(200).json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  res.status(200).json({ success: true, user });
};

export const logoutUser = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
};
