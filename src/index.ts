import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { AuthService } from "./auth.js";
import { GmailService } from "./gmail.js";
import { CustomerStore } from "./store.js";
import { UploadServer } from "./upload.js";
import { TOOLS_DEFINITIONS, PROMPTS_DEFINITIONS } from "./tools.js"; // Define your tool schemas in a separate file

class GmailMCPServer {
  private server: Server;
  private auth: AuthService;
  private store: CustomerStore;
  private gmail: GmailService | null = null;
  private uploadServer: UploadServer;

  constructor() {
    this.server = new Server(
      { name: "gmail-mcp", version: "1.0.0" },
      {
        capabilities: { resources: {}, tools: {}, prompts: {} },
      }
    );

    this.auth = new AuthService();
    this.store = new CustomerStore();
    this.uploadServer = new UploadServer(this.store);

    // Initialize Logic
    this.init();
  }

  async init() {
    const hasTokens = await this.auth.loadTokens();
    if (hasTokens) {
      this.gmail = new GmailService(this.auth.getClient());
      console.error("✅ Tokens loaded. Gmail ready.");
    } else {
      console.error(
        "⚠️ No tokens found. Please use 'authenticate_gmail' tool."
      );
    }

    this.setupHandlers();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS_DEFINITIONS,
    }));

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: PROMPTS_DEFINITIONS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Auth Tools
      if (name === "authenticate_gmail") {
        const url = await this.auth.startAuthFlow(
          args?.useManualFlow as boolean
        );
        return {
          content: [{ type: "text", text: `Please authorize here: ${url}` }],
        };
      }

      if (name === "complete_authentication") {
        await this.auth.exchangeCode(args?.code as string);
        this.gmail = new GmailService(this.auth.getClient());
        return {
          content: [{ type: "text", text: "Authentication successful!" }],
        };
      }

      // Upload Tools
      if (name === "start_upload_server") {
        const url = await this.uploadServer.start(
          (args?.port as number) || 8080
        );
        return {
          content: [{ type: "text", text: `Upload server running at ${url}` }],
        };
      }

      // Gmail Tools (Require Auth)
      if (!this.gmail)
        throw new McpError(ErrorCode.InvalidRequest, "Gmail not authenticated");

      if (name === "send_email") {
        await this.gmail.sendEmail(
          args?.to as string,
          args?.subject as string,
          args?.body as string
        );
        return { content: [{ type: "text", text: "Sent!" }] };
      }

      if (name === "send_bulk_email") {
        const customers = this.store.getAll();
        if (!customers.length) throw new Error("No customer data loaded");

        let sent = 0;
        for (const cx of customers) {
          // Simple interpolation
          let body = args?.body as string;
          Object.keys(cx).forEach(
            (k) => (body = body.replace(`{${k}}`, cx[k]))
          );

          await this.gmail.sendEmail(cx.email, args?.subject as string, body);
          sent++;
        }
        return {
          content: [
            { type: "text", text: `Bulk email sent to ${sent} recipients.` },
          ],
        };
      }

      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    });

    // Implement Resource Handlers (List/Read) similar to original...
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new GmailMCPServer();
server.run().catch(console.error);
