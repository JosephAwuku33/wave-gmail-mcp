import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs/promises";
import * as path from "path";
import * as http from "http";
import { parse } from "url";
import open from "open";
import { CONFIG, ROOT_DIR } from "./config.js";

// Use absolute path for tokens
const TOKEN_PATH = path.join(ROOT_DIR, ".gmail-tokens.json");

export class AuthService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      CONFIG.REDIRECT_URI || "http://localhost:3000/oauth2callback"
    );
  }

  getClient(): OAuth2Client {
    return this.oauth2Client;
  }

  async loadTokens(): Promise<boolean> {
    try {
      const tokenData = await fs.readFile(TOKEN_PATH, "utf-8");
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);
      return true;
    } catch {
      return false;
    }
  }

  async startAuthFlow(useManual: boolean): Promise<string> {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
    });

    if (useManual) return authUrl;

    // Open browser and wait for callback
    await open(authUrl);
    return await this.waitForCallback();
  }

  private async waitForCallback(): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        const parsedUrl = parse(req.url || "", true);
        if (parsedUrl.pathname === "/oauth2callback") {
          const code = parsedUrl.query.code as string;
          if (code) {
            res.end("Authentication successful! You can close this tab.");
            await this.exchangeCode(code);
            resolve("Authentication complete.");
            server.close();
          }
        }
      });
      server.listen(3000);
    });
  }

  async exchangeCode(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  }
}
