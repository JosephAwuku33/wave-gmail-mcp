// src/config.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 1. Get the absolute path of the current file (dist/config.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Resolve the root directory (assuming dist/ is one level deep)
// If config.js is in dist/config.js, we go up one level to get the project root
export const ROOT_DIR = path.resolve(__dirname, "..");

// 3. Load .env from the calculated absolute path
const result = dotenv.config({ path: path.join(ROOT_DIR, ".env") });

if (result.error) {
  // Log to stderr so it shows up in Claude Desktop logs
  console.error("⚠️ Could not load .env file from:", path.join(ROOT_DIR, ".env"));
}

export const CONFIG = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback",
  OAUTH_PORT: parseInt(process.env.OAUTH_PORT || "3000", 10),
};

// Debugging: Print to stderr to verify credentials are loaded
if (!CONFIG.GOOGLE_CLIENT_ID) {
  console.error("❌ CRITICAL: GOOGLE_CLIENT_ID is missing. Auth will fail.");
} else {
  console.error("✅ Configuration loaded successfully.");
}