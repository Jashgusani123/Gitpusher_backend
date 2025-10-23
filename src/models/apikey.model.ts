import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  usageId: { type: mongoose.Schema.Types.ObjectId, ref: "Usage", required: true, default: null },
  hashedKey: { type: String, required: true, unique: true },
  apikey: { type: String, required: true, unique: true },
  label: { type: String, enum: ['Active', 'Expired'], default: 'Active' },
  limit: { type: Number, required: true },
  ip:{type:String ,default:null}

}, { timestamps: true });

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
