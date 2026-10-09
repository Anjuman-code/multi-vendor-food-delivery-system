export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailProvider {
  name: string;
  send(options: SendOptions): Promise<SendResult>;
}
