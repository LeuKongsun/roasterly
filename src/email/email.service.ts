import { Resend } from "resend";
import { env } from "../config/env.js";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

let resendClient: Resend | undefined;

export async function sendEmail(input: SendEmailInput) {
  if (!env.RESEND_API_KEY || !env.ROSTER_EMAIL_FROM) {
    if (env.NODE_ENV !== "test") {
      console.warn("Email delivery skipped because Resend is not configured");
    }

    return;
  }

  const { error } = await resend().emails.send({
    from: env.ROSTER_EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });

  if (error) {
    if (env.NODE_ENV !== "production" && isResendTestRecipientError(error.message)) {
      console.warn(`Email delivery skipped by Resend test mode: ${error.message}`);
      return;
    }

    throw new Error(`Resend email delivery failed: ${error.message}`);
  }
}

function isResendTestRecipientError(message: string) {
  return message.includes("You can only send testing emails to your own email address");
}

function resend() {
  resendClient ??= new Resend(env.RESEND_API_KEY);

  return resendClient;
}
