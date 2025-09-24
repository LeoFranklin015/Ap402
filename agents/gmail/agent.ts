import { OpenAI } from "openai";
import { OpenAIToolSet } from "composio-core";
import dotenv from "dotenv";

dotenv.config();

export interface EmailResult {
  success: boolean;
  messageId?: string;
  emailSubject?: string;
  emailBody?: string;
  error?: string;
}

export interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  useAI?: boolean;
}

export class GmailAgent {
  private openaiClient: OpenAI;
  private composioToolset: OpenAIToolSet;
  private tools: any[] = [];

  constructor() {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "Missing OpenAI API key. Please check your environment variables."
      );
    }

    console.info("Initializing Gmail agent with Composio and OpenAI...");

    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Composio toolset
    this.composioToolset = new OpenAIToolSet({
      apiKey: process.env.COMPOSIO_API_KEY!,
    });

    console.info("Gmail agent initialized successfully");
  }

  /**
   * Initialize Gmail tools from Composio
   */
  private async initializeTools(): Promise<void> {
    try {
      this.tools = await this.composioToolset.getTools({
        actions: ["GMAIL_SEND_EMAIL"],
      });
      console.info("Gmail tools initialized successfully");
    } catch (error: any) {
      console.error(`Failed to initialize Gmail tools: ${error.message}`);
      throw new Error(`Gmail tools initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate email content using AI
   */
  private async generateEmailContent(
    subject: string,
    content: string
  ): Promise<{ subject: string; body: string }> {
    try {
      const prompt = `Please help me compose a professional email with the following information:

Subject: ${subject}
Content/Key Points: ${content}

Please generate:
1. A refined, professional subject line
2. A well-structured email body that is clear, concise, and professional

Requirements:
- Professional tone
- Clear and concise
- Proper email structure with greeting and closing
- No unnecessary formatting or special characters

Format the response as:
Subject: [refined subject]
Body: [email body]`;

      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional email assistant. Generate clear, concise, and professional email content. Always format your response with 'Subject:' and 'Body:' labels.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content?.trim() || "";
      console.info("Email content generated using AI");

      // Parse the AI response
      const subjectMatch = aiResponse.match(/Subject:\s*(.+)/i);
      const bodyMatch = aiResponse.match(/Body:\s*([\s\S]+)/i);

      const refinedSubject = subjectMatch ? subjectMatch[1].trim() : subject;
      const refinedBody = bodyMatch ? bodyMatch[1].trim() : content;

      return {
        subject: refinedSubject,
        body: refinedBody,
      };
    } catch (error: any) {
      console.error(`Error generating email content: ${error.message}`);
      // Return original content if AI generation fails
      return {
        subject: subject,
        body: content,
      };
    }
  }

  /**
   * Send email using Gmail
   */
  async sendEmail(emailRequest: EmailRequest): Promise<EmailResult> {
    try {
      // Initialize tools if not already done
      if (!this.tools || this.tools.length === 0) {
        await this.initializeTools();
      }

      console.info(`Preparing to send email to: ${emailRequest.to}`);

      let finalSubject = emailRequest.subject;
      let finalBody = emailRequest.content;

      // Use AI to enhance email content if requested
      if (emailRequest.useAI) {
        console.info("Using AI to enhance email content...");
        const aiContent = await this.generateEmailContent(
          emailRequest.subject,
          emailRequest.content
        );
        finalSubject = aiContent.subject;
        finalBody = aiContent.body;
        console.info(`AI-enhanced subject: ${finalSubject}`);
      }

      // Create instruction for Gmail sending
      const instruction = `Send an email with the following details:
- To: ${emailRequest.to}
- Subject: ${finalSubject}
- Body: ${finalBody}

Please send this email now.`;

      console.info("Sending email using Composio Gmail integration...");

      // Create chat completion request with Gmail tools
      const response = await this.openaiClient.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are an email assistant. Use the Gmail tools to send emails as requested. Always use the tools provided to actually send the email.",
          },
          {
            role: "user",
            content: instruction,
          },
        ],
        tools: this.tools,
        tool_choice: "auto",
      });

      // Handle the tool call response
      const toolResponse = await this.composioToolset.handleToolCall(response);

      console.info("✅ Email sent successfully");
      console.info(`Tool response: ${JSON.stringify(toolResponse, null, 2)}`);

      return {
        success: true,
        emailSubject: finalSubject,
        emailBody: finalBody,
        messageId: toolResponse[0] || "unknown",
      };
    } catch (error: any) {
      console.error(`❌ Error sending email: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a simple email without AI enhancement
   */
  async sendSimpleEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      content: body,
      useAI: false,
    });
  }

  /**
   * Send an AI-enhanced email
   */
  async sendAIEmail(content: string): Promise<EmailResult> {
    const hardcodedEmail = "leofranklin1509@gmail.com"; // Change this to your desired email
    const defaultSubject = "Exciting Updates on Hackathon";
    return this.sendEmail({
      to: hardcodedEmail,
      subject: defaultSubject,
      content,
      useAI: true,
    });
  }
}
