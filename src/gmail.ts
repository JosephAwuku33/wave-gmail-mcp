import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { EmailMessage } from "./types.js";

export class GmailService {
  private gmail: gmail_v1.Gmail;

  constructor(authClient: OAuth2Client) {
    this.gmail = google.gmail({ version: "v1", auth: authClient });
  }

  async getMessages(label: string, maxResults = 50): Promise<EmailMessage[]> {
    const response = await this.gmail.users.messages.list({
      userId: "me",
      labelIds: [label],
      maxResults,
    });

    const messages: EmailMessage[] = [];
    if (!response.data.messages) return [];

    for (const msg of response.data.messages) {
      const detail = await this.gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
      });

      const headers = detail.data.payload?.headers || [];
      messages.push({
        id: detail.data.id!,
        threadId: detail.data.threadId!,
        subject: headers.find((h) => h.name === "Subject")?.value || "",
        from: headers.find((h) => h.name === "From")?.value || "",
        to: headers.find((h) => h.name === "To")?.value || "",
        date: headers.find((h) => h.name === "Date")?.value || "",
        snippet: detail.data.snippet || "",
      });
    }
    return messages;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // FIX: Use MailComposer for proper MIME handling (Unicode, HTML, etc.)
    // We use nodemailer to BUILD the message, but Google API to SEND it.
    const mailComposer = new MailComposer({
      to,
      subject,
      text: body,
      // html: body // Uncomment if you want to support HTML input
    });

    const message = await mailComposer.compile().build();

    // Encode to URL-Safe Base64
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });
  }

  async searchEmails(query: string): Promise<any[]> {
    const res = await this.gmail.users.messages.list({
      userId: "me",
      q: query,
    });
    return res.data.messages || [];
  }
}
