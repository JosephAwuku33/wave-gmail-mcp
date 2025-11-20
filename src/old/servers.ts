// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// import {
//   CallToolRequestSchema,
//   ListResourcesRequestSchema,
//   ListToolsRequestSchema,
//   ReadResourceRequestSchema,
//   ListPromptsRequestSchema,
//   GetPromptRequestSchema,
//   ErrorCode,
//   McpError,
// } from "@modelcontextprotocol/sdk/types.js";
// import { google } from "googleapis";
// import { OAuth2Client } from "google-auth-library";
// import * as XLSX from "xlsx";
// import * as fs from "fs/promises";
// import * as path from "path";
// import * as http from "http";
// import { parse } from "url";

// // Types
// interface CustomerData {
//   email: string;
//   name?: string;
//   [key: string]: any;
// }

// interface EmailMessage {
//   id: string;
//   threadId: string;
//   subject: string;
//   from: string;
//   to: string;
//   date: string;
//   snippet: string;
//   body?: string;
// }

// // Gmail MCP Server Class
// class GmailMCPServer {
//   private server: Server;
//   private oauth2Client: OAuth2Client;
//   private gmail: any;
//   private customerDataCache: CustomerData[] = [];
//   private isAuthenticated: boolean = false;
//   private authCallbackServer: http.Server | null = null;
//   private uploadServer: http.Server | null = null;

//   constructor() {
//     this.server = new Server(
//       {
//         name: "gmail-customer-server",
//         version: "1.0.0",
//       },
//       {
//         capabilities: {
//           resources: {},
//           tools: {},
//           prompts: {},
//         },
//       }
//     );

//     // Initialize OAuth2 client
//     this.oauth2Client = new google.auth.OAuth2(
//       process.env.GOOGLE_CLIENT_ID ,
//       process.env.GOOGLE_CLIENT_SECRET,
//       process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback"
//     );

//     // Try to load existing tokens
//     this.loadSavedTokens();

//     this.setupHandlers();
//     this.setupErrorHandling();
//   }

//   private setupErrorHandling(): void {
//     this.server.onerror = (error) => {
//       console.error("[MCP Error]", error);
//     };

//     process.on("SIGINT", async () => {
//       if (this.authCallbackServer) {
//         this.authCallbackServer.close();
//       }
//       if (this.uploadServer) {
//         this.uploadServer.close();
//       }
//       await this.server.close();
//       process.exit(0);
//     });
//   }

//   // Load saved OAuth tokens if they exist
//   private async loadSavedTokens(): Promise<void> {
//     try {
//       const tokenPath = path.join(process.cwd(), ".gmail-tokens.json");
//       const tokenData = await fs.readFile(tokenPath, "utf-8");
//       const tokens = JSON.parse(tokenData);

//       this.oauth2Client.setCredentials(tokens);
//       this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
//       this.isAuthenticated = true;

//       console.log("Loaded saved Gmail authentication tokens");
//     } catch (error) {
//       // No saved tokens, user will need to authenticate
//       console.error("No saved tokens found. User needs to authenticate.");
//     }
//   }

//   private setupHandlers(): void {
//     // List available resources
//     this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
//       if (!this.isAuthenticated) {
//         return { resources: [] };
//       }

//       return {
//         resources: [
//           {
//             uri: "gmail://inbox",
//             mimeType: "application/json",
//             name: "Gmail Inbox",
//             description: "Access your Gmail inbox messages",
//           },
//           {
//             uri: "gmail://sent",
//             mimeType: "application/json",
//             name: "Gmail Sent",
//             description: "Access your sent Gmail messages",
//           },
//           {
//             uri: "gmail://labels",
//             mimeType: "application/json",
//             name: "Gmail Labels",
//             description: "List all Gmail labels",
//           },
//           {
//             uri: "gmail://customer-data",
//             mimeType: "application/json",
//             name: "Customer Data",
//             description: "Uploaded customer data from CSV/XLSX files",
//           },
//         ],
//       };
//     });

//     // Read resource content
//     this.server.setRequestHandler(
//       ReadResourceRequestSchema,
//       async (request) => {
//         const uri = request.params.uri.toString();

//         if (!this.isAuthenticated && !uri.includes("customer-data")) {
//           throw new McpError(
//             ErrorCode.InvalidRequest,
//             "Gmail not authenticated. Please authenticate first."
//           );
//         }

//         if (uri === "gmail://inbox") {
//           const messages = await this.getMessages("INBOX", 50);
//           return {
//             contents: [
//               {
//                 uri: request.params.uri,
//                 mimeType: "application/json",
//                 text: JSON.stringify(messages, null, 2),
//               },
//             ],
//           };
//         }

//         if (uri === "gmail://sent") {
//           const messages = await this.getMessages("SENT", 50);
//           return {
//             contents: [
//               {
//                 uri: request.params.uri,
//                 mimeType: "application/json",
//                 text: JSON.stringify(messages, null, 2),
//               },
//             ],
//           };
//         }

//         if (uri === "gmail://labels") {
//           const labels = await this.getLabels();
//           return {
//             contents: [
//               {
//                 uri: request.params.uri,
//                 mimeType: "application/json",
//                 text: JSON.stringify(labels, null, 2),
//               },
//             ],
//           };
//         }

//         if (uri === "gmail://customer-data") {
//           return {
//             contents: [
//               {
//                 uri: request.params.uri,
//                 mimeType: "application/json",
//                 text: JSON.stringify(this.customerDataCache, null, 2),
//               },
//             ],
//           };
//         }

//         throw new McpError(
//           ErrorCode.InvalidRequest,
//           `Unknown resource: ${uri}`
//         );
//       }
//     );

//     // List available tools
//     this.server.setRequestHandler(ListToolsRequestSchema, async () => {
//       return {
//         tools: [
//           {
//             name: "authenticate_gmail",
//             description:
//               "Authenticate with Gmail using OAuth2. Starts a local server and opens authorization in browser.",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 useManualFlow: {
//                   type: "boolean",
//                   description:
//                     "If true, returns URL for manual authentication instead of auto-opening browser",
//                   default: false,
//                 },
//               },
//             },
//           },
//           {
//             name: "complete_authentication",
//             description:
//               "Complete Gmail authentication with the authorization code (only needed if using manual flow)",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 code: {
//                   type: "string",
//                   description: "Authorization code from OAuth2 flow",
//                 },
//               },
//               required: ["code"],
//             },
//           },
//           {
//             name: "upload_customer_data",
//             description:
//               "Upload customer data from CSV or XLSX file. Supports file path, base64 content, or URL.",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 filePath: {
//                   type: "string",
//                   description:
//                     "Path to the CSV or XLSX file on the local filesystem",
//                 },
//                 fileContent: {
//                   type: "string",
//                   description:
//                     "Base64 encoded file content (alternative to filePath)",
//                 },
//                 fileUrl: {
//                   type: "string",
//                   description:
//                     "URL to download the file from (alternative to filePath)",
//                 },
//                 fileName: {
//                   type: "string",
//                   description:
//                     "Original file name (required when using fileContent or fileUrl)",
//                 },
//                 emailColumn: {
//                   type: "string",
//                   description: "Name of the column containing email addresses",
//                   default: "email",
//                 },
//               },
//               oneOf: [
//                 { required: ["filePath"] },
//                 { required: ["fileContent", "fileName"] },
//                 { required: ["fileUrl", "fileName"] },
//               ],
//             },
//           },
//           {
//             name: "start_upload_server",
//             description:
//               "Start a web server with file upload interface for easy customer data upload",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 port: {
//                   type: "number",
//                   description: "Port to run the upload server on",
//                   default: 8080,
//                 },
//               },
//             },
//           },
//           {
//             name: "send_bulk_email",
//             description: "Send bulk emails to customers from uploaded data",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 subject: {
//                   type: "string",
//                   description: "Email subject line",
//                 },
//                 body: {
//                   type: "string",
//                   description:
//                     "Email body (can include {name} and other placeholders)",
//                 },
//                 filter: {
//                   type: "object",
//                   description: "Optional filter criteria for customers",
//                   properties: {},
//                   additionalProperties: true,
//                 },
//               },
//               required: ["subject", "body"],
//             },
//           },
//           {
//             name: "search_emails",
//             description: "Search Gmail messages with a query",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 query: {
//                   type: "string",
//                   description:
//                     "Gmail search query (e.g., 'from:example@gmail.com')",
//                 },
//                 maxResults: {
//                   type: "number",
//                   description: "Maximum number of results",
//                   default: 10,
//                 },
//               },
//               required: ["query"],
//             },
//           },
//           {
//             name: "send_email",
//             description: "Send a single email",
//             inputSchema: {
//               type: "object",
//               properties: {
//                 to: {
//                   type: "string",
//                   description: "Recipient email address",
//                 },
//                 subject: {
//                   type: "string",
//                   description: "Email subject",
//                 },
//                 body: {
//                   type: "string",
//                   description: "Email body",
//                 },
//               },
//               required: ["to", "subject", "body"],
//             },
//           },
//         ],
//       };
//     });

//     // Handle tool calls
//     this.server.setRequestHandler(
//       CallToolRequestSchema,
//       async (request): Promise<unknown | any> => {
//         const { name, arguments: args } = request.params;

//         try {
//           switch (name) {
//             case "authenticate_gmail":
//               return await this.authenticateGmail(
//                 args?.useManualFlow as boolean
//               );

//             case "complete_authentication":
//               return await this.completeAuthentication(args?.code as string);

//             case "upload_customer_data":
//               return await this.uploadCustomerData(
//                 args?.filePath as string,
//                 args?.fileContent as string,
//                 args?.fileUrl as string,
//                 args?.fileName as string,
//                 args?.emailColumn as string
//               );

//             case "start_upload_server":
//               return await this.startUploadServer(args?.port as number);

//             case "send_bulk_email":
//               return await this.sendBulkEmail(
//                 args?.subject as string,
//                 args?.body as string,
//                 args?.filter as Record<string, any>
//               );

//             case "search_emails":
//               return await this.searchEmails(
//                 args?.query as string,
//                 args?.maxResults as number
//               );

//             case "send_email":
//               return await this.sendEmail(
//                 args?.to as string,
//                 args?.subject as string,
//                 args?.body as string
//               );

//             default:
//               throw new McpError(
//                 ErrorCode.MethodNotFound,
//                 `Unknown tool: ${name}`
//               );
//           }
//         } catch (error: any) {
//           return {
//             content: [
//               {
//                 type: "text",
//                 text: `Error: ${error.message}`,
//               },
//             ],
//             isError: true,
//           };
//         }
//       }
//     );

//     // List available prompts
//     this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
//       return {
//         prompts: [
//           {
//             name: "categorize_customers",
//             description:
//               "Categorize customers based on their email data and attributes",
//             arguments: [
//               {
//                 name: "criteria",
//                 description:
//                   "Categorization criteria (e.g., industry, engagement level)",
//                 required: false,
//               },
//             ],
//           },
//           {
//             name: "compose_bulk_email",
//             description:
//               "Generate a personalized bulk email template for customers",
//             arguments: [
//               {
//                 name: "purpose",
//                 description:
//                   "Purpose of the email (e.g., promotion, newsletter, update)",
//                 required: true,
//               },
//               {
//                 name: "tone",
//                 description:
//                   "Tone of the email (e.g., professional, casual, friendly)",
//                 required: false,
//               },
//             ],
//           },
//           {
//             name: "analyze_email_engagement",
//             description:
//               "Analyze email engagement patterns and suggest improvements",
//             arguments: [],
//           },
//           {
//             name: "segment_customers",
//             description:
//               "Segment customers into groups based on available data",
//             arguments: [
//               {
//                 name: "segmentation_type",
//                 description:
//                   "Type of segmentation (e.g., demographic, behavioral)",
//                 required: true,
//               },
//             ],
//           },
//         ],
//       };
//     });

//     // Get prompt content
//     this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
//       const { name, arguments: args } = request.params;

//       switch (name) {
//         case "categorize_customers":
//           return {
//             messages: [
//               {
//                 role: "user",
//                 content: {
//                   type: "text",
//                   text: `Analyze the customer data and categorize customers based on ${
//                     args?.criteria || "relevant attributes"
//                   }.

// Customer Data:
// ${JSON.stringify(this.customerDataCache, null, 2)}

// Please provide:
// 1. Clear categories with descriptions
// 2. Number of customers in each category
// 3. Key characteristics of each category
// 4. Recommendations for targeting each category`,
//                 },
//               },
//             ],
//           };

//         case "compose_bulk_email":
//           const purpose = args?.purpose || "general communication";
//           const tone = args?.tone || "professional";
//           return {
//             messages: [
//               {
//                 role: "user",
//                 content: {
//                   type: "text",
//                   text: `Compose a personalized bulk email template for our customers.

// Purpose: ${purpose}
// Tone: ${tone}
// Number of recipients: ${this.customerDataCache.length}

// Available customer fields for personalization:
// ${Object.keys(this.customerDataCache[0] || {}).join(", ")}

// Requirements:
// 1. Include personalization placeholders (e.g., {name}, {email})
// 2. Create an engaging subject line
// 3. Write a compelling body that serves the purpose
// 4. Include a clear call-to-action
// 5. Keep it concise and ${tone}

// Please provide:
// - Subject line
// - Email body with placeholders
// - Suggestions for A/B testing variants`,
//                 },
//               },
//             ],
//           };

//         case "analyze_email_engagement":
//           return {
//             messages: [
//               {
//                 role: "user",
//                 content: {
//                   type: "text",
//                   text: `Analyze the email engagement data from my Gmail account and customer interactions.

// Recent emails data available through gmail://inbox and gmail://sent resources.
// Customer data: ${this.customerDataCache.length} customers loaded.

// Please provide:
// 1. Analysis of email response patterns
// 2. Best times to send emails
// 3. Most engaging subject line patterns
// 4. Recommendations for improving open and response rates
// 5. Identification of highly engaged vs. dormant customers`,
//                 },
//               },
//             ],
//           };

//         case "segment_customers":
//           const segmentationType = args?.segmentation_type || "general";
//           return {
//             messages: [
//               {
//                 role: "user",
//                 content: {
//                   type: "text",
//                   text: `Segment our customers using ${segmentationType} segmentation.

// Customer Data:
// ${JSON.stringify(this.customerDataCache, null, 2)}

// Please provide:
// 1. Defined segments with clear criteria
// 2. Size of each segment
// 3. Characteristics and behaviors of each segment
// 4. Personalized communication strategies for each segment
// 5. Potential value and priority of each segment`,
//                 },
//               },
//             ],
//           };

//         default:
//           throw new McpError(
//             ErrorCode.InvalidRequest,
//             `Unknown prompt: ${name}`
//           );
//       }
//     });
//   }

//   // Gmail OAuth Authentication
//   private async authenticateGmail(useManualFlow: boolean = false) {
//     const authUrl = this.oauth2Client.generateAuthUrl({
//       access_type: "offline",
//       scope: [
//         "https://www.googleapis.com/auth/gmail.readonly",
//         "https://www.googleapis.com/auth/gmail.send",
//         "https://www.googleapis.com/auth/gmail.modify",
//       ],
//     });

//     if (useManualFlow) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Please visit this URL to authorize the application:\n\n${authUrl}\n\nAfter authorizing, you'll receive a code. Use the 'complete_authentication' tool with that code.`,
//           },
//         ],
//       };
//     }

//     // Start callback server
//      await this.startCallbackServer();

//     // Auto-open browser
//     const open = (await import("open")).default;
//     await open(authUrl);

//     return {
//       content: [
//         {
//           type: "text",
//           text: `Opening browser for authentication...\n\nIf the browser doesn't open automatically, visit:\n${authUrl}\n\nWaiting for authorization...`,
//         },
//       ],
//     };
//   }

//   // Start a temporary HTTP server to receive OAuth callback
//   private async startCallbackServer(): Promise<string> {
//     return new Promise((resolve, reject) => {
//       const port = parseInt(process.env.OAUTH_PORT || "3000");

//       this.authCallbackServer = http.createServer(async (req, res) => {
//         const parsedUrl = parse(req.url || "", true);

//         if (parsedUrl.pathname === "/oauth2callback") {
//           const code = parsedUrl.query.code as string;

//           if (code) {
//             res.writeHead(200, { "Content-Type": "text/html" });
//             res.end(`
//               <!DOCTYPE html>
//               <html>
//                 <head>
//                   <title>Authentication Successful</title>
//                   <style>
//                     body {
//                       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//                       display: flex;
//                       justify-content: center;
//                       align-items: center;
//                       height: 100vh;
//                       margin: 0;
//                       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                     }
//                     .container {
//                       background: white;
//                       padding: 40px;
//                       border-radius: 10px;
//                       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
//                       text-align: center;
//                       max-width: 500px;
//                     }
//                     .success-icon {
//                       font-size: 64px;
//                       margin-bottom: 20px;
//                     }
//                     h1 {
//                       color: #333;
//                       margin-bottom: 10px;
//                     }
//                     p {
//                       color: #666;
//                       line-height: 1.6;
//                     }
//                   </style>
//                 </head>
//                 <body>
//                   <div class="container">
//                     <div class="success-icon">✅</div>
//                     <h1>Authentication Successful!</h1>
//                     <p>You have successfully authenticated with Gmail.</p>
//                     <p>You can now close this window and return to your application.</p>
//                   </div>
//                 </body>
//               </html>
//             `);

//             // Complete authentication automatically
//             try {
//               await this.completeAuthenticationInternal(code);
//               resolve(code);
//             } catch (error: any) {
//               reject(error);
//             } finally {
//               // Close the server after a short delay
//               setTimeout(() => {
//                 this.authCallbackServer?.close();
//                 this.authCallbackServer = null;
//               }, 1000);
//             }
//           } else {
//             res.writeHead(400, { "Content-Type": "text/html" });
//             res.end(`
//               <!DOCTYPE html>
//               <html>
//                 <head>
//                   <title>Authentication Failed</title>
//                   <style>
//                     body {
//                       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//                       display: flex;
//                       justify-content: center;
//                       align-items: center;
//                       height: 100vh;
//                       margin: 0;
//                       background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
//                     }
//                     .container {
//                       background: white;
//                       padding: 40px;
//                       border-radius: 10px;
//                       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
//                       text-align: center;
//                       max-width: 500px;
//                     }
//                     .error-icon {
//                       font-size: 64px;
//                       margin-bottom: 20px;
//                     }
//                     h1 {
//                       color: #333;
//                       margin-bottom: 10px;
//                     }
//                     p {
//                       color: #666;
//                       line-height: 1.6;
//                     }
//                   </style>
//                 </head>
//                 <body>
//                   <div class="container">
//                     <div class="error-icon">❌</div>
//                     <h1>Authentication Failed</h1>
//                     <p>No authorization code received.</p>
//                     <p>Please try authenticating again.</p>
//                   </div>
//                 </body>
//               </html>
//             `);
//             reject(new Error("No authorization code received"));
//           }
//         }
//       });

//       this.authCallbackServer.listen(port, () => {
//         console.error(`OAuth callback server listening on port ${port}`);
//       });

//       // Timeout after 5 minutes
//       setTimeout(() => {
//         if (this.authCallbackServer) {
//           this.authCallbackServer.close();
//           this.authCallbackServer = null;
//           reject(
//             new Error(
//               "Authentication timeout - no response received within 5 minutes"
//             )
//           );
//         }
//       }, 300000);
//     });
//   }

//   private async completeAuthenticationInternal(code: string): Promise<void> {
//     const { tokens } = await this.oauth2Client.getToken(code);
//     this.oauth2Client.setCredentials(tokens);
//     this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
//     this.isAuthenticated = true;

//     // Save tokens for future use
//     await fs.writeFile(
//       path.join(process.cwd(), ".gmail-tokens.json"),
//       JSON.stringify(tokens, null, 2)
//     );
//   }

//   private async completeAuthentication(code: string) {
//     try {
//       await this.completeAuthenticationInternal(code);

//       return {
//         content: [
//           {
//             type: "text",
//             text: "Successfully authenticated with Gmail! You can now access your emails and send messages.",
//           },
//         ],
//       };
//     } catch (error: any) {
//       throw new Error(`Authentication failed: ${error.message}`);
//     }
//   }

//   // Get Gmail messages
//   private async getMessages(
//     label: string,
//     maxResults: number = 50
//   ): Promise<EmailMessage[]> {
//     const response = await this.gmail.users.messages.list({
//       userId: "me",
//       labelIds: [label],
//       maxResults,
//     });

//     const messages: EmailMessage[] = [];

//     if (response.data.messages) {
//       for (const message of response.data.messages.slice(0, maxResults)) {
//         const detail = await this.gmail.users.messages.get({
//           userId: "me",
//           id: message.id,
//           format: "full",
//         });

//         const headers = detail.data.payload.headers;
//         const subject =
//           headers.find((h: any) => h.name === "Subject")?.value || "";
//         const from = headers.find((h: any) => h.name === "From")?.value || "";
//         const to = headers.find((h: any) => h.name === "To")?.value || "";
//         const date = headers.find((h: any) => h.name === "Date")?.value || "";

//         messages.push({
//           id: detail.data.id!,
//           threadId: detail.data.threadId!,
//           subject,
//           from,
//           to,
//           date,
//           snippet: detail.data.snippet || "",
//         });
//       }
//     }

//     return messages;
//   }

//   // Get Gmail labels
//   private async getLabels() {
//     const response = await this.gmail.users.labels.list({
//       userId: "me",
//     });

//     return response.data.labels || [];
//   }

//   // Upload customer data from CSV/XLSX
//   private async uploadCustomerData(
//     filePath?: string,
//     fileContent?: string,
//     fileUrl?: string,
//     fileName?: string,
//     emailColumn: string = "email" 
//   ) {
//     try {
//       let workbook: XLSX.WorkBook;
//       let detectedFileName = "";

//       // Method 1: File path (local file system)
//       if (filePath) {
//         detectedFileName = path.basename(filePath);
//         workbook = XLSX.readFile(filePath);
//       }
//       // Method 2: Base64 encoded content
//       else if (fileContent && fileName) {
//         detectedFileName = fileName;
//         // Decode base64 content
//         const buffer = Buffer.from(fileContent, "base64");
//         workbook = XLSX.read(buffer, { type: "buffer" });
//       }
//       // Method 3: Download from URL
//       else if (fileUrl && fileName) {
//         detectedFileName = fileName;
//         const response = await fetch(fileUrl);
//         if (!response.ok) {
//           throw new Error(`Failed to download file: ${response.statusText}`);
//         }
//         const arrayBuffer = await response.arrayBuffer();
//         workbook = XLSX.read(arrayBuffer, { type: "array" });
//       } else {
//         throw new Error(
//           "Please provide either filePath, fileContent with fileName, or fileUrl with fileName"
//         );
//       }

//       // Validate file extension
//       const fileExtension = path.extname(detectedFileName).toLowerCase();
//       if (![".csv", ".xlsx", ".xls"].includes(fileExtension)) {
//         throw new Error(
//           `Unsupported file format: ${fileExtension}. Please use CSV or XLSX files.`
//         );
//       }

//       // Parse the workbook
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const data: any = XLSX.utils.sheet_to_json(worksheet);

//       if (data.length === 0) {
//         throw new Error("The uploaded file contains no data");
//       }

//       // Validate email column exists
//       if (!data[0].hasOwnProperty(emailColumn)) {
//         const availableColumns = Object.keys(data[0]).join(", ");
//         throw new Error(
//           `Email column '${emailColumn}' not found. Available columns: ${availableColumns}`
//         );
//       }

//       // Store customer data
//       this.customerDataCache = data.map((row: any) => ({
//         email: row[emailColumn],
//         ...row,
//       }));

//       // Calculate statistics
//       const uniqueEmails = new Set(this.customerDataCache.map((c) => c.email))
//         .size;
//       const columns = Object.keys(data[0]);
//       const sampleSize = Math.min(3, this.customerDataCache.length);

//       return {
//         content: [
//           {
//             type: "text",
//             text: `✅ Successfully uploaded customer data from: ${detectedFileName}

// 📊 Statistics:
// - Total records: ${this.customerDataCache.length}
// - Unique emails: ${uniqueEmails}
// - Columns: ${columns.length}

// 📋 Available columns:
// ${columns.join(", ")}

// 📝 Sample data (first ${sampleSize} records):
// ${JSON.stringify(this.customerDataCache.slice(0, sampleSize), null, 2)}`,
//           },
//         ],
//       };
//     } catch (error: any) {
//       throw new Error(`Failed to upload customer data: ${error.message}`);
//     }
//   }

//   // Start a web server for file uploads
//   private async startUploadServer(port: number = 8080) {
//     if (this.uploadServer) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Upload server is already running on port ${port}. Visit http://localhost:${port}`,
//           },
//         ],
//       };
//     }

//     return new Promise((resolve) => {
//       this.uploadServer = http.createServer(async (req, res) => {
//         // Enable CORS
//         res.setHeader("Access-Control-Allow-Origin", "*");
//         res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//         res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//         if (req.method === "OPTIONS") {
//           res.writeHead(200);
//           res.end();
//           return;
//         }

//         if (req.method === "GET" && req.url === "/") {
//           // Serve the upload HTML page
//           res.writeHead(200, { "Content-Type": "text/html" });
//           res.end(`
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Customer Data Upload - Gmail MCP Server</title>
//     <style>
//         * {
//             margin: 0;
//             padding: 0;
//             box-sizing: border-box;
//         }
        
//         body {
//             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//             min-height: 100vh;
//             display: flex;
//             justify-content: center;
//             align-items: center;
//             padding: 20px;
//         }
        
//         .container {
//             background: white;
//             padding: 40px;
//             border-radius: 20px;
//             box-shadow: 0 20px 60px rgba(0,0,0,0.3);
//             max-width: 600px;
//             width: 100%;
//         }
        
//         h1 {
//             color: #333;
//             margin-bottom: 10px;
//             font-size: 28px;
//         }
        
//         .subtitle {
//             color: #666;
//             margin-bottom: 30px;
//             font-size: 14px;
//         }
        
//         .upload-area {
//             border: 3px dashed #667eea;
//             border-radius: 10px;
//             padding: 40px;
//             text-align: center;
//             cursor: pointer;
//             transition: all 0.3s;
//             margin-bottom: 20px;
//         }
        
//         .upload-area:hover {
//             border-color: #764ba2;
//             background: #f8f9ff;
//         }
        
//         .upload-area.dragover {
//             border-color: #764ba2;
//             background: #f0f2ff;
//         }
        
//         .upload-icon {
//             font-size: 48px;
//             margin-bottom: 10px;
//         }
        
//         input[type="file"] {
//             display: none;
//         }
        
//         .form-group {
//             margin-bottom: 20px;
//         }
        
//         label {
//             display: block;
//             margin-bottom: 8px;
//             color: #333;
//             font-weight: 600;
//         }
        
//         input[type="text"] {
//             width: 100%;
//             padding: 12px;
//             border: 2px solid #e0e0e0;
//             border-radius: 8px;
//             font-size: 14px;
//             transition: border-color 0.3s;
//         }
        
//         input[type="text"]:focus {
//             outline: none;
//             border-color: #667eea;
//         }
        
//         button {
//             width: 100%;
//             padding: 14px;
//             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//             color: white;
//             border: none;
//             border-radius: 8px;
//             font-size: 16px;
//             font-weight: 600;
//             cursor: pointer;
//             transition: transform 0.2s, box-shadow 0.2s;
//         }
        
//         button:hover {
//             transform: translateY(-2px);
//             box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
//         }
        
//         button:disabled {
//             opacity: 0.6;
//             cursor: not-allowed;
//             transform: none;
//         }
        
//         .file-info {
//             background: #f8f9ff;
//             padding: 15px;
//             border-radius: 8px;
//             margin-bottom: 20px;
//             display: none;
//         }
        
//         .file-info.visible {
//             display: block;
//         }
        
//         .file-name {
//             font-weight: 600;
//             color: #667eea;
//             margin-bottom: 5px;
//         }
        
//         .file-size {
//             color: #666;
//             font-size: 14px;
//         }
        
//         .result {
//             margin-top: 20px;
//             padding: 20px;
//             border-radius: 8px;
//             display: none;
//         }
        
//         .result.success {
//             background: #d4edda;
//             border: 1px solid #c3e6cb;
//             color: #155724;
//             display: block;
//         }
        
//         .result.error {
//             background: #f8d7da;
//             border: 1px solid #f5c6cb;
//             color: #721c24;
//             display: block;
//         }
        
//         .result-title {
//             font-weight: 600;
//             margin-bottom: 10px;
//         }
        
//         .result-details {
//             white-space: pre-wrap;
//             font-family: 'Courier New', monospace;
//             font-size: 12px;
//         }
        
//         .loading {
//             display: none;
//             text-align: center;
//             margin: 20px 0;
//         }
        
//         .loading.visible {
//             display: block;
//         }
        
//         .spinner {
//             border: 4px solid #f3f3f3;
//             border-top: 4px solid #667eea;
//             border-radius: 50%;
//             width: 40px;
//             height: 40px;
//             animation: spin 1s linear infinite;
//             margin: 0 auto 10px;
//         }
        
//         @keyframes spin {
//             0% { transform: rotate(0deg); }
//             100% { transform: rotate(360deg); }
//         }
//     </style>
// </head>
// <body>
//     <div class="container">
//         <h1>📧 Customer Data Upload</h1>
//         <p class="subtitle">Gmail MCP Server - Upload CSV or XLSX files</p>
        
//         <div class="upload-area" id="uploadArea">
//             <div class="upload-icon">📁</div>
//             <p><strong>Click to select</strong> or drag and drop your file here</p>
//             <p style="font-size: 12px; color: #999; margin-top: 10px;">Supported: CSV, XLSX, XLS</p>
//         </div>
        
//         <input type="file" id="fileInput" accept=".csv,.xlsx,.xls">
        
//         <div class="file-info" id="fileInfo">
//             <div class="file-name" id="fileName"></div>
//             <div class="file-size" id="fileSize"></div>
//         </div>
        
//         <form id="uploadForm">
//             <div class="form-group">
//                 <label for="emailColumn">Email Column Name</label>
//                 <input type="text" id="emailColumn" value="email" placeholder="Enter the column name containing emails">
//             </div>
            
//             <button type="submit" id="uploadBtn">Upload Customer Data</button>
//         </form>
        
//         <div class="loading" id="loading">
//             <div class="spinner"></div>
//             <p>Uploading and processing...</p>
//         </div>
        
//         <div class="result" id="result">
//             <div class="result-title" id="resultTitle"></div>
//             <div class="result-details" id="resultDetails"></div>
//         </div>
//     </div>
    
//     <script>
//         let selectedFile = null;
        
//         const uploadArea = document.getElementById('uploadArea');
//         const fileInput = document.getElementById('fileInput');
//         const fileInfo = document.getElementById('fileInfo');
//         const fileName = document.getElementById('fileName');
//         const fileSize = document.getElementById('fileSize');
//         const uploadForm = document.getElementById('uploadForm');
//         const uploadBtn = document.getElementById('uploadBtn');
//         const loading = document.getElementById('loading');
//         const result = document.getElementById('result');
//         const resultTitle = document.getElementById('resultTitle');
//         const resultDetails = document.getElementById('resultDetails');
        
//         // Click to select file
//         uploadArea.addEventListener('click', () => fileInput.click());
        
//         // File selected
//         fileInput.addEventListener('change', (e) => {
//             const file = e.target.files[0];
//             if (file) handleFile(file);
//         });
        
//         // Drag and drop
//         uploadArea.addEventListener('dragover', (e) => {
//             e.preventDefault();
//             uploadArea.classList.add('dragover');
//         });
        
//         uploadArea.addEventListener('dragleave', () => {
//             uploadArea.classList.remove('dragover');
//         });
        
//         uploadArea.addEventListener('drop', (e) => {
//             e.preventDefault();
//             uploadArea.classList.remove('dragover');
//             const file = e.dataTransfer.files[0];
//             if (file) handleFile(file);
//         });
        
//         function handleFile(file) {
//             selectedFile = file;
//             fileName.textContent = file.name;
//             fileSize.textContent = formatFileSize(file.size);
//             fileInfo.classList.add('visible');
//             result.style.display = 'none';
//         }
        
//         function formatFileSize(bytes) {
//             if (bytes < 1024) return bytes + ' B';
//             if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
//             return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
//         }
        
//         uploadForm.addEventListener('submit', async (e) => {
//             e.preventDefault();
            
//             if (!selectedFile) {
//                 showResult('error', 'Please select a file first');
//                 return;
//             }
            
//             const emailColumn = document.getElementById('emailColumn').value.trim();
//             if (!emailColumn) {
//                 showResult('error', 'Please enter an email column name');
//                 return;
//             }
            
//             uploadBtn.disabled = true;
//             loading.classList.add('visible');
//             result.style.display = 'none';
            
//             try {
//                 // Convert file to base64
//                 const base64 = await fileToBase64(selectedFile);
                
//                 // Send to server
//                 const response = await fetch('/upload', {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                     },
//                     body: JSON.stringify({
//                         fileContent: base64,
//                         fileName: selectedFile.name,
//                         emailColumn: emailColumn
//                     })
//                 });
                
//                 const data = await response.json();
                
//                 if (response.ok) {
//                     showResult('success', 'Upload Successful!', data.message);
//                 } else {
//                     showResult('error', 'Upload Failed', data.error || 'Unknown error occurred');
//                 }
//             } catch (error) {
//                 showResult('error', 'Upload Failed', error.message);
//             } finally {
//                 uploadBtn.disabled = false;
//                 loading.classList.remove('visible');
//             }
//         });
        
//         function fileToBase64(file) {
//             return new Promise((resolve, reject) => {
//                 const reader = new FileReader();
//                 reader.onload = () => {
//                     const base64 = reader.result.split(',')[1];
//                     resolve(base64);
//                 };
//                 reader.onerror = reject;
//                 reader.readAsDataURL(file);
//             });
//         }
        
//         function showResult(type, title, details = '') {
//             result.className = 'result ' + type;
//             resultTitle.textContent = title;
//             resultDetails.textContent = details;
//         }
//     </script>
// </body>
// </html>
//           `);
//         } else if (req.method === "POST" && req.url === "/upload") {
//           // Handle file upload
//           let body = "";
//           req.on("data", (chunk) => (body += chunk.toString()));
//           req.on("end", async () => {
//             try {
//               const { fileContent, fileName, emailColumn } = JSON.parse(body);

//               // Process the upload using existing method
//               const result = await this.uploadCustomerData(
//                 undefined,
//                 fileContent,
//                 undefined,
//                 fileName,
//                 emailColumn || "email"
//               );

//               res.writeHead(200, { "Content-Type": "application/json" });
//               res.end(
//                 JSON.stringify({
//                   success: true,
//                   message: result.content[0].text,
//                 })
//               );
//             } catch (error: any) {
//               res.writeHead(400, { "Content-Type": "application/json" });
//               res.end(
//                 JSON.stringify({
//                   success: false,
//                   error: error.message,
//                 })
//               );
//             }
//           });
//         } else {
//           res.writeHead(404);
//           res.end("Not Found");
//         }
//       });

//       this.uploadServer.listen(port, () => {
//         console.error(`Upload server running on http://localhost:${port}`);

//         // Try to open browser
//         import("open").then(({ default: open }) => {
//           open(`http://localhost:${port}`);
//         });

//         resolve({
//           content: [
//             {
//               type: "text",
//               text: `🌐 Upload server started successfully!\n\n📍 URL: http://localhost:${port}\n\n✨ The upload interface will open in your browser automatically.\n\nYou can now:\n1. Drag and drop CSV/XLSX files\n2. Or click to select files\n3. Specify the email column name\n4. Upload and process customer data\n\nThe server will keep running until you close it.`,
//             },
//           ],
//         });
//       });
//     });
//   }

//   // Send bulk emails
//   private async sendBulkEmail(
//     subject: string,
//     body: string,
//     filter?: Record<string, any>
//   ) {
//     if (!this.isAuthenticated) {
//       throw new Error("Gmail not authenticated");
//     }

//     if (this.customerDataCache.length === 0) {
//       throw new Error(
//         "No customer data uploaded. Please upload a customer file first."
//       );
//     }

//     let recipients = this.customerDataCache;

//     // Apply filter if provided
//     if (filter) {
//       recipients = recipients.filter((customer) => {
//         return Object.entries(filter).every(([key, value]) => {
//           return customer[key] === value;
//         });
//       });
//     }

//     const results = {
//       total: recipients.length,
//       sent: 0,
//       failed: 0,
//       errors: [] as string[],
//     };

//     for (const customer of recipients) {
//       try {
//         // Replace placeholders in subject and body
//         let personalizedSubject = subject;
//         let personalizedBody = body;

//         Object.entries(customer).forEach(([key, value]) => {
//           const placeholder = `{${key}}`;
//           personalizedSubject = personalizedSubject.replace(
//             new RegExp(placeholder, "g"),
//             String(value)
//           );
//           personalizedBody = personalizedBody.replace(
//             new RegExp(placeholder, "g"),
//             String(value)
//           );
//         });

//         await this.sendEmail(
//           customer.email,
//           personalizedSubject,
//           personalizedBody
//         );
//         results.sent++;
//       } catch (error: any) {
//         results.failed++;
//         results.errors.push(`${customer.email}: ${error.message}`);
//       }
//     }

//     return {
//       content: [
//         {
//           type: "text",
//           text: `Bulk email campaign completed!\n\nTotal recipients: ${
//             results.total
//           }\nSuccessfully sent: ${results.sent}\nFailed: ${results.failed}\n\n${
//             results.errors.length > 0
//               ? `Errors:\n${results.errors.join("\n")}`
//               : ""
//           }`,
//         },
//       ],
//     };
//   }

//   // Search emails
//   private async searchEmails(query: string, maxResults: number = 10) {
//     if (!this.isAuthenticated) {
//       throw new Error("Gmail not authenticated");
//     }

//     const response = await this.gmail.users.messages.list({
//       userId: "me",
//       q: query,
//       maxResults,
//     });

//     if (!response.data.messages || response.data.messages.length === 0) {
//       return {
//         content: [
//           {
//             type: "text",
//             text: "No messages found matching your query.",
//           },
//         ],
//       };
//     }

//     const messages: EmailMessage[] = [];
//     for (const message of response.data.messages) {
//       const detail = await this.gmail.users.messages.get({
//         userId: "me",
//         id: message.id,
//         format: "full",
//       });

//       const headers = detail.data.payload.headers;
//       messages.push({
//         id: detail.data.id!,
//         threadId: detail.data.threadId!,
//         subject: headers.find((h: any) => h.name === "Subject")?.value || "",
//         from: headers.find((h: any) => h.name === "From")?.value || "",
//         to: headers.find((h: any) => h.name === "To")?.value || "",
//         date: headers.find((h: any) => h.name === "Date")?.value || "",
//         snippet: detail.data.snippet || "",
//       });
//     }

//     return {
//       content: [
//         {
//           type: "text",
//           text: JSON.stringify(messages, null, 2),
//         },
//       ],
//     };
//   }

//   // Send single email
//   private async sendEmail(to: string, subject: string, body: string) {
//     if (!this.isAuthenticated) {
//       throw new Error("Gmail not authenticated");
//     }

//     const email = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\n");

//     const encodedEmail = Buffer.from(email)
//       .toString("base64")
//       .replace(/\+/g, "-")
//       .replace(/\//g, "_")
//       .replace(/=+$/, "");

//     await this.gmail.users.messages.send({
//       userId: "me",
//       requestBody: {
//         raw: encodedEmail,
//       },
//     });

//     return {
//       content: [
//         {
//           type: "text",
//           text: `Email sent successfully to ${to}`,
//         },
//       ],
//     };
//   }

//   async run(): Promise<void> {
//     const transport = new StdioServerTransport();
//     await this.server.connect(transport);
//     console.error("Gmail MCP Server running on stdio");
//   }
// }

// // Main execution
// const server = new GmailMCPServer();
// server.run().catch(console.error);
