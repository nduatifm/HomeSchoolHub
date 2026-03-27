import nodemailer from 'nodemailer';
import { buildEmailHtml, primaryButton } from './emailTemplates';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getBaseUrl(): string {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  return 'http://localhost:5000';
}

const FROM = `"Lyra Preparatory" <${process.env.SMTP_USER}>`;

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">Welcome, ${name}!</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4a5e50;">
      Thanks for signing up. Please confirm your email address to activate your Lyra Preparatory account.
    </p>
    ${primaryButton('Verify Email Address', verificationUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      This link expires in <strong>24 hours</strong>. If you didn&rsquo;t create an account, you can safely ignore this email.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#b8c8bb;word-break:break-all;">
      Or copy and paste: ${verificationUrl}
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'Verify your email — Lyra Preparatory',
      html: buildEmailHtml(bodyHtml, { preheader: `Hi ${name}, please verify your email to get started.` }),
      text: `Hi ${name},\n\nPlease verify your email address to activate your Lyra Preparatory account:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\n© Lyra Preparatory`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Verification email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendStudentInviteEmail(
  email: string,
  studentName: string,
  inviteCode: string,
  parentName: string
) {
  const baseUrl = getBaseUrl();
  const signupUrl = `${baseUrl}/student-signup?token=${inviteCode}`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">You&rsquo;ve been invited, ${studentName}!</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4a5e50;">
      <strong>${parentName}</strong> has invited you to join <strong>Lyra Preparatory</strong> as a student.
      Click the button below to create your account — your invite is pre-filled automatically.
    </p>
    ${primaryButton('Create My Account', signupUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      This invite expires in <strong>7 days</strong>.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#b8c8bb;word-break:break-all;">
      Or copy and paste: ${signupUrl}
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${parentName} invited you to Lyra Preparatory`,
      html: buildEmailHtml(bodyHtml, { preheader: `${parentName} has invited you to join Lyra Preparatory as a student.` }),
      text: `Hi ${studentName},\n\n${parentName} has invited you to join Lyra Preparatory as a student.\n\nCreate your account here:\n${signupUrl}\n\nThis invite expires in 7 days.\n\n© Lyra Preparatory`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Student invite email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">Reset your password</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4a5e50;">
      Hi ${name}, we received a request to reset the password for your Lyra Preparatory account.
      Click the button below to choose a new password.
    </p>
    ${primaryButton('Reset Password', resetUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      This link expires in <strong>1 hour</strong>. If you didn&rsquo;t request a password reset, you can safely ignore this email — your password will not change.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#b8c8bb;word-break:break-all;">
      Or copy and paste: ${resetUrl}
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'Reset your Lyra Preparatory password',
      html: buildEmailHtml(bodyHtml, { preheader: `Hi ${name}, here's your password reset link. It expires in 1 hour.` }),
      text: `Hi ${name},\n\nWe received a request to reset your Lyra Preparatory password.\n\nReset it here:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\n© Lyra Preparatory`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
}
