import { Request, Response } from "express";
import { ApiKey } from "../models/apikey.model";
import { compareKey } from "../utils/hash.utils";
import { Usage } from "../models/usage.model";
import { AuthenticatedRequest } from "../Types/authenticatedRequest.type";
import { User } from "../models/user.model";
import { subDays, startOfDay } from "date-fns";

// TODO: use here IP for better tracking
export const addUsage = async (req: Request, res: Response) => {
  const { token, usageData, limit } = req.body;
  if (!token || !usageData) {
    return res.status(400).json({ success: false, message: "Token and usage data are required" });
  }
  try {
    const apikey = await ApiKey.find();
    let matchedKey = null;

    for (const key of apikey) {
      const isMatch = await compareKey(token, key.hashedKey);
      if (isMatch) {
        matchedKey = key;
        key.limit = limit;
        if (limit === 0) {
          key.label = "Expired";
        }
        await key.save();
        // Update usage statistics
        const usage = await Usage.findById(key.usageId);
        if (!usage) {
          return res.status(404).json({ success: false, message: "Usage record not found" });
        }
        usageData.forEach((data: any) => {
          usage.commits.push(data);
        })
        usage.totalRequests = usage.commits.length;
        usage.commits.forEach(commit => {
          if (commit.status === "success") usage.successCount += 1;
          else if (commit.status === "failure") usage.failureCount += 1;
        });
        usage.save();
      }
    }
    if (!matchedKey) {
      return res.status(404).json({ success: false, message: "API key not found" });
    }
    // Here you would typically add the usage data to your database
    return res.status(200).json({ success: true, message: "Usage data added successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    // Aggregation pipeline
    const analytics = await ApiKey.aggregate([
      { $match: { _id: { $in: (await User.findById(userId).select("apikeys"))?.apikeys } } },
      {
        $lookup: {
          from: "usages",
          localField: "usageId",
          foreignField: "_id",
          as: "usage"
        }
      },
      { $unwind: { path: "$usage", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$label",
          count: { $sum: 1 },
          totalRequests: { $sum: { $ifNull: ["$usage.totalRequests", 0] } }
        }
      }
    ]);

    // Transform result to friendly format
    const result = {
      activeTokens: 0,
      expiredTokens: 0,
      totalRequests: 0
    };

    analytics.forEach(item => {
      if (item._id === "Active") result.activeTokens = item.count;
      else if (item._id === "Expired") result.expiredTokens = item.count;

      result.totalRequests += item.totalRequests;
    });

    return res.status(200).json({ success: true, analytics: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getActivityLogs = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId).select("apikeys");
    if (!user || !user.apikeys.length) {
      return res.status(404).json({ success: false, message: "No API keys found" });
    }

    const logs = await ApiKey.aggregate([
      { $match: { _id: { $in: user.apikeys } } },
      {
        $lookup: {
          from: "usages",
          localField: "usageId",
          foreignField: "_id",
          as: "usage"
        }
      },
      { $unwind: { path: "$usage", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$usage.commits", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          commitMessage: "$usage.commits.commitMessage",
          status: "$usage.commits.status",
          timestamp: "$usage.commits.timestamp"
        }
      },
      { $match: { commitMessage: { $ne: null } } },
      { $sort: { timestamp: -1 } },
      { $limit: 50 }
    ]);


    return res.status(200).json({ success: true, activityLogs: logs ?? [] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const daysWiseAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId).select("apikeys");
    if (!user || !user.apikeys.length) {
      return res.status(404).json({ success: false, message: "No API keys found" });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // last 7 days

    const usageCommits = await ApiKey.aggregate([
      { $match: { _id: { $in: user.apikeys } } },
      {
        $lookup: {
          from: "usages",
          localField: "usageId",
          foreignField: "_id",
          as: "usage"
        }
      },
      { $unwind: { path: "$usage", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$usage.commits", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "usage.commits.timestamp": { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$usage.commits.timestamp" },
          totalRequests: { $sum: 1 },
          successCount: { $sum: { $cond: [{ $eq: ["$usage.commits.status", "success"] }, 1, 0] } },
          failureCount: { $sum: { $cond: [{ $eq: ["$usage.commits.status", "failure"] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          dayIndex: "$_id",
          day: {
            $arrayElemAt: [
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
              { $subtract: ["$_id", 1] }
            ]
          },
          totalRequests: 1,
          successCount: 1,
          failureCount: 1
        }
      },
      { $sort: { dayIndex: 1 } }
    ]);

    return res.status(200).json({ success: true, daysWiseAnalytics: usageCommits });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const successVsFailure = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const user = await User.findById(userId).select("apikeys");
    if (!user || !user.apikeys.length) {
      return res.status(404).json({ success: false, message: "No API keys found" });
    }

    const successFailure = await ApiKey.aggregate([
      { $match: { _id: { $in: user.apikeys } } },
      {
        $lookup: {
          from: "usages",
          localField: "usageId",
          foreignField: "_id",
          as: "usage",
        },
      },
      { $unwind: { path: "$usage", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$usage._id",
          totalSuccess: { $sum: "$usage.successCount" },
          totalFailure: { $sum: "$usage.failureCount" },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      successFailure: successFailure[0] || { totalSuccess: 0, totalFailure: 0 },
    });
  } catch (error) {
    console.error("Error in successVsFailure:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
