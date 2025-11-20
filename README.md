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
npm install