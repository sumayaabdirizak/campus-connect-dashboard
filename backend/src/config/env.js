import dotenv from "dotenv";

// Ensure local backend/.env values win over machine-level vars (e.g. global DATABASE_URL).
dotenv.config({ override: true });

export const env = {
  PORT: process.env.PORT || "4000",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

export function assertEnv() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }
}