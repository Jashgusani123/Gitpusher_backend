import mongoose from "mongoose";

const commitLogSchema = new mongoose.Schema({
  commitMessage: { type: String, required: true },
  status: { type: String, enum: ["success", "failure"], required: true },
  branch: { type: String },
  remote: { type: String },
  repolink: { type: String },
  requestDetails: {
    userInput: { type: String, required: true },
    modelResponseLength: { type: Number },
    responseMimeType: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
});

const usageSchema = new mongoose.Schema({
  totalRequests: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  commits: [commitLogSchema] 
}, { timestamps: true });

export const Usage = mongoose.model("Usage", usageSchema);
