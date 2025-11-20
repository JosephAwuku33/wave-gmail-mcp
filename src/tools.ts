import { Tool, Prompt } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS_DEFINITIONS: Tool[] = [
  {
    name: "authenticate_gmail",
    description: "Authenticate with Gmail using OAuth2. Starts a local server and opens authorization in browser.",
    inputSchema: {
      type: "object",
      properties: {
        useManualFlow: {
          type: "boolean",
          description: "If true, returns URL for manual authentication instead of auto-opening browser",
          default: false,
        },
      },
    },
  },
  {
    name: "complete_authentication",
    description: "Complete Gmail authentication with the authorization code (only needed if using manual flow)",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Authorization code from OAuth2 flow",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "start_upload_server",
    description: "Start a local web server with a drag-and-drop interface for easy customer data upload (CSV/XLSX).",
    inputSchema: {
      type: "object",
      properties: {
        port: {
          type: "number",
          description: "Port to run the upload server on",
          default: 8080,
        },
      },
    },
  },
  {
    name: "upload_customer_data",
    description: "Directly upload customer data from a local file path (alternative to the web UI).",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to the CSV or XLSX file on the local filesystem",
        },
        emailColumn: {
          type: "string",
          description: "Name of the column containing email addresses",
          default: "email",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "send_bulk_email",
    description: "Send bulk emails to customers currently loaded in the store.",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Email subject line",
        },
        body: {
          type: "string",
          description: "Email body. Supports placeholders like {name}, {email} based on columns in the uploaded data.",
        },
      },
      required: ["subject", "body"],
    },
  },
  {
    name: "send_email",
    description: "Send a single email to a specific address.",
    inputSchema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "search_emails",
    description: "Search Gmail messages using Gmail search syntax (e.g., 'from:boss@company.com').",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Gmail search query",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results",
          default: 10,
        },
      },
      required: ["query"],
    },
  },
];

export const PROMPTS_DEFINITIONS: Prompt[] = [
  {
    name: "compose_bulk_email",
    description: "Generate a personalized bulk email template for customers",
    arguments: [
      {
        name: "purpose",
        description: "Purpose of the email (e.g., promotion, newsletter)",
        required: true,
      },
      {
        name: "tone",
        description: "Tone of the email (e.g., professional, casual)",
        required: false,
      },
    ],
  },
  {
    name: "analyze_email_engagement",
    description: "Analyze email engagement patterns based on sent/received history",
  },
];