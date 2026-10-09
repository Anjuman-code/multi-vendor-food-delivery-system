import fs from 'fs';
import path from 'path';
import { IEmailProvider, SendOptions, SendResult } from './email-provider.interface';

export class SandboxEmailProvider implements IEmailProvider {
  public readonly name = 'sandbox';
  private readonly previewDir: string;

  constructor() {
    this.previewDir = path.resolve(process.cwd(), '.email-previews');
    if (!fs.existsSync(this.previewDir)) {
      fs.mkdirSync(this.previewDir, { recursive: true });
    }
  }

  public async send(options: SendOptions): Promise<SendResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeRecipient = options.to.replace(/[^a-zA-Z0-9@_-]/g, '_');
      const baseFilename = `${timestamp}_${safeRecipient}`;

      const htmlPath = path.join(this.previewDir, `${baseFilename}.html`);
      const textPath = path.join(this.previewDir, `${baseFilename}.txt`);

      // Write HTML preview with metadata wrapper
      const previewWrapper = `<!--
Subject: ${options.subject}
To: ${options.to}
From: ${options.from || 'Food Rush'}
Date: ${new Date().toISOString()}
Headers: ${JSON.stringify(options.headers || {}, null, 2)}
-->
${options.html}`;

      fs.writeFileSync(htmlPath, previewWrapper, 'utf8');
      fs.writeFileSync(textPath, `Subject: ${options.subject}\n\n${options.text}`, 'utf8');

      const messageId = `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      return {
        success: true,
        messageId,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to write sandbox email preview';
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
