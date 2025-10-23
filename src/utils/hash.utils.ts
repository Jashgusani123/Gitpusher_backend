import bcrypt from "bcrypt";
import crypto from "crypto"

export const generateApiKey = (): string => {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
};

export const hashKey = async (key: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(key, salt);
};

export const compareKey = async (key: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(key, hash);
};
