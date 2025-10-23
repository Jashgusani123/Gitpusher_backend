import { Request, Response } from "express";
import { compareKey, generateApiKey, hashKey } from "../utils/hash.utils";
import { AuthenticatedRequest } from "../Types/authenticatedRequest.type";
import { User } from "../models/user.model";
import { ApiKey } from "../models/apikey.model";
import { Usage } from "../models/usage.model";
import { log } from "node:console";
import mongoose from "mongoose";

export const createApiKey = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { limit, apikey } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const randomAPIkey = generateApiKey();
        const hashedKey = await hashKey(randomAPIkey);

        const newUsage = await Usage.create({ totalRequests: 0, successCount: 0, failureCount: 0, commits: [] });
        const newAPIKey = await ApiKey.create({
            hashedKey,
            limit,
            label: "Active",
            usageId: newUsage._id,
            apikey
        });

        user.apikeys.push(newAPIKey._id);
        await user.save();

        // Return only the random key to the frontend (for CLI)
        return res.status(201).json({ success: true, randomAPIkey, limit: newAPIKey.limit });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

export const verifyHashedKeyGetApiKey = async (req: Request, res: Response) => {
  const { randomAPIkey , ip:clientIp} = req.body;

//   const clientIp =
//     (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
//     req.socket.remoteAddress ||
//     req.ip;

  if (!randomAPIkey)
    return res.status(400).json({ success: false, message: "Random API key is required" });
  console.log(clientIp);
  
  try {
    const allKeys = await ApiKey.find();
    let matchedKey = null;

    for (const key of allKeys) {
      const isMatch = await compareKey(randomAPIkey, key.hashedKey);
      if (isMatch) {
        matchedKey = key;

        // Save IP if first time
        if (!key.ip && clientIp) {
          key.ip = clientIp;
          await key.save();
        }
        // If IP mismatch, block
        else if (key.ip && key.ip !== clientIp) {
          console.log(`IP mismatch detected for key: ${key.ip}`);
          return res.status(403).json({ success: false, message: "IP mismatch detected" });
        }

        break;
      }
    }

    if (!matchedKey)
      return res.status(404).json({ success: false, message: "API key not found" });

    return res.status(200).json({
      success: true,
      details: { limit: matchedKey.limit, apikey: matchedKey.apikey, ip: clientIp },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getApiKey = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    try {
        const user = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "apikeys",          
                    localField: "apikeys",    
                    foreignField: "_id",      
                    as: "apikeyDetails"
                }
            }
        ]);

        if (!user || user.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // apikeyDetails will be inside user[0]
        return res.status(200).json({ success: true, apikeyDetails: user[0].apikeyDetails });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

export const deleteApiKey = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    if(!userId){
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { apiKeyId } = req.params;
    if(!apiKeyId){
        return res.status(400).json({ success: false, message: "API Key ID is required" });
    }
    try{
        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if(!user.apikeys.includes(new mongoose.Types.ObjectId(apiKeyId))){
            return res.status(403).json({ success: false, message: "API Key does not belong to the user" });
        }
        const deletedKey =  await ApiKey.findByIdAndDelete(apiKeyId).populate('usageId');
        if(deletedKey && deletedKey.usageId){
            await Usage.findByIdAndDelete(deletedKey.usageId);
        }
        return res.status(200).json({ success: true, message: "API Key deleted successfully" });
    }catch(error){
        console.error(error)
        return res.status(500).json({ success: false, message: "Server error" });
    }
}