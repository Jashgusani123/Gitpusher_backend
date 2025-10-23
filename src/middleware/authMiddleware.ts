import jwt, { JwtPayload } from "jsonwebtoken";
import {Request,Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../Types/authenticatedRequest.type";

export const protect = (req: Request, res: Response, next: NextFunction) => {
  
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload & { id: string };
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
