import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db";

import authRoutes from "./routes/user.route";
import apiKeyRoutes from "./routes/apikey.route";
import usageRoutes from "./routes/usage.route";
import cookieParser from "cookie-parser";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:8080","https://gitpusher-dashboard.vercel.app/"], // your frontend URL
    credentials: true, // allow cookies or auth headers
  })
);
app.use(helmet());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/api/usage", usageRoutes);

export default app;
