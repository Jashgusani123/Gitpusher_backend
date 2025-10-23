import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:{type:String , require:true},
  imageURL:{type:String},
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  apikeys:{type:[mongoose.Schema.Types.ObjectId],ref:"ApiKey",default:[]}
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
