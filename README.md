# 📨 Gmail MCP Server

**A powerful Model Context Protocol (MCP) server that connects your AI agents to Gmail.**

This server allows AI models (like Claude) to interact with your mailbox securely. Beyond just reading and sending emails, it features a **Customer Engagement System** that enables you to upload customer data (CSV/Excel) via a local drag-and-drop interface and perform personalized bulk email campaigns.

---

## ✨ Features

* **🔐 Secure Authentication:** Uses OAuth2 to authenticate with Google. Tokens are saved locally so you only log in once.
* **📧 Full Email Management:** Read emails, search your history, and send new messages.
* **📊 Customer Data Import:** A built-in **local web interface** to drag-and-drop CSV or XLSX files containing customer lists.
* **🚀 Bulk Campaigns:** Send personalized emails to your uploaded customer list using placeholders (e.g., `Hi {name}, check out {product}!`).
* **💾 Data Persistence:** Customer data is cached locally, so it survives server restarts.
* **🛡️ Type-Safe:** Built with TypeScript for reliability and robustness.

---

## 🛠️ Prerequisites

Before running the server, you need:

1.  **Node.js** (v16 or higher) installed on your machine.
2.  A **Google Cloud Project** with the **Gmail API** enabled.
3.  **OAuth Credentials** (Client ID and Client Secret) from Google Cloud.

> **👉 Google Cloud Setup Note:**
> Ensure your OAuth consent screen is set up and you have added `http://localhost:3000/oauth2callback` to your **Authorized Redirect URIs**.

---

## ⚙️ Installation & Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd gmail-mcp-server

# Install dependencies
pnpm install
```

### 2. Configure Environment Variables
Create a **.env** file in the root directory of your project. You can copy the template below:
```bash
# .env file
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
OAUTH_PORT=3000
```

### 3. Build the Project
Compile the TypeScript code into JavaScript
```bash
pnpm run build
```

## 🚀 Usage
**Running Standalone**
You can run the server directly to test it (though it is designed to be run by an MCP client like Claude and its host Claude Desktop).

**Connecting to Claude Desktop** 🤖
To use this with Claude, you need to add it to your `claude_desktop_config.json` file.

**Location**: 
- **Mac** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration**: Add the following entry to the mcpServers object. Important: Use absolute paths.
```bash
{
  "mcpServers": {
    "gmail-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id_here",
        "GOOGLE_CLIENT_SECRET": "your_client_secret_here",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth2callback"
      }
    }
  }
}
```
💡 **Tip:** passing environment variables directly in the JSON config is often more reliable than relying on .env files when running via Claude Desktop


## 🧰 Available Tools
| Tool Name | Description |
| :--- | :--- |
| `authenticate_gmail` | Starts the OAuth flow to log you in. |
| `start_upload_server` | Spins up a local web page to upload Excel/CSV files easily. |
| `upload_customer_data` | Manual upload tool if you have a file path ready. |
| `send_email` | Sends a single plain-text or HTML email. |
| `send_bulk_email` | Sends personalized emails to everyone in your uploaded list. |
| `search_emails` | Finds emails using Gmail search syntax (e.g., `from:boss`). |

## ⚠️ Troubleshooting
- **Browser won't open:** If the auth link doesn't open automatically, the tool will provide a URL. Copy and paste that into your browser.
- **"Client ID missing":** Ensure you are using absolute paths in your Claude config or that your .env file is in the correct root folder.
- **Upload errors:** Ensure your CSV/Excel file has headers. You will need to tell the tool which column contains the email (default is "email").

## Reference 

- [MCP Documentation](https://modelcontextprotocol.io/docs/getting-started/intro)