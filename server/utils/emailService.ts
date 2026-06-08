import nodemailer from 'nodemailer';
import { buildEmailHtml, primaryButton } from './emailTemplates';

// Escape HTML special characters to prevent injection in email bodies
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection on startup so misconfigured credentials surface immediately
// rather than failing silently per-email. Non-fatal: the server starts regardless.
transporter.verify().then(() => {
  console.log('[email] SMTP connection verified — email delivery is ready');
}).catch((err: Error) => {
  console.warn('[email] SMTP connection failed — emails will not be delivered:', err.message);
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
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">Welcome, ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4a5e50;">
      Thanks for signing up. Please confirm your email address to activate your Lyra Preparatory account.
    </p>
    ${primaryButton('Verify Email Address', verificationUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      This link expires in <strong>24 hours</strong>. If you didn&rsquo;t create an account, you can safely ignore this email.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#b8c8bb;word-break:break-all;">
      Or copy and paste: ${escapeHtml(verificationUrl)}
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
  const signupUrl = `${baseUrl}/student-signup`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">You&rsquo;ve been invited, ${escapeHtml(studentName)}!</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a5e50;">
      <strong>${escapeHtml(parentName)}</strong> has invited you to join <strong>Lyra Preparatory</strong> as a student.
      Use the invite code below to create your account.
    </p>
    <div style="background:#f0f9f5;border:2px solid #1E8C64;border-radius:10px;padding:20px 24px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#1E8C64;">Your invite code</p>
      <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:6px;color:#1a2e23;font-family:monospace;">${escapeHtml(inviteCode)}</p>
    </div>
    ${primaryButton('Go to Sign-Up Page', signupUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      Go to <strong>${signupUrl}</strong>, click &ldquo;Student sign-up&rdquo;, and enter the code above.
      This invite expires in <strong>7 days</strong>.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: `${parentName} invited you to Lyra Preparatory`,
      html: buildEmailHtml(bodyHtml, { preheader: `Your invite code: ${inviteCode}. ${parentName} has invited you to join Lyra Preparatory.` }),
      text: `Hi ${studentName},\n\n${parentName} has invited you to join Lyra Preparatory as a student.\n\nYour invite code: ${inviteCode}\n\nGo to ${signupUrl} and enter your invite code to create your account.\n\nThis invite expires in 7 days.\n\n© Lyra Preparatory`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Student invite email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTeamInviteEmail({
  toEmail,
  inviterName,
  studentName,
  role,
  token,
  expiresAt,
}: {
  toEmail: string;
  inviterName: string;
  studentName: string;
  role: 'owner' | 'member';
  token: string;
  expiresAt: Date;
}) {
  const baseUrl = getBaseUrl();
  const acceptUrl = `${baseUrl}/team-invite/${token}`;
  const roleLabel = role === 'owner' ? 'Owner' : 'Member';
  const expiryStr = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">You&rsquo;ve been invited to a family team!</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a5e50;">
      <strong>${escapeHtml(inviterName)}</strong> has invited you to co-manage <strong>${escapeHtml(studentName)}</strong>&rsquo;s
      Lyra Preparatory account as a <strong>${escapeHtml(roleLabel)}</strong>.
    </p>
    ${primaryButton('Accept Invitation', acceptUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:#9bb09f;line-height:1.6;">
      This invitation expires on <strong>${expiryStr}</strong>.
      If you don&rsquo;t have an account yet, you&rsquo;ll be able to create one after clicking the button above.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#b8c8bb;word-break:break-all;">
      Or copy and paste: ${acceptUrl}
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: toEmail,
      subject: `${inviterName} invited you to co-manage ${studentName} on Lyra Preparatory`,
      html: buildEmailHtml(bodyHtml, { preheader: `${inviterName} invited you to help manage ${studentName}'s Lyra account.` }),
      text: `${inviterName} has invited you to co-manage ${studentName}'s Lyra Preparatory account as a ${roleLabel}.\n\nAccept the invitation: ${acceptUrl}\n\nThis invitation expires on ${expiryStr}.\n\n© Lyra Preparatory`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Team invite email error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">Reset your password</h2>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#4a5e50;">
      Hi ${escapeHtml(name)}, we received a request to reset the password for your Lyra Preparatory account.
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

export async function sendNotificationEmail(
  email: string,
  name: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  const ctaUrl = link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? link : '/' + link}`;
  const profileUrl = `${baseUrl}/profile`;

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1a2e23;">${escapeHtml(title)}</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a5e50;">${escapeHtml(body)}</p>
    ${primaryButton('Open Lyra Preparatory', ctaUrl)}
    <p style="margin:32px 0 0;font-size:12px;color:#b8c8bb;line-height:1.6;">
      You&rsquo;re receiving this because email notifications are enabled on your Lyra Preparatory account.
      <a href="${profileUrl}" style="color:#1E8C64;text-decoration:underline;">Turn them off in your profile settings.</a>
    </p>
  `;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: title,
    html: buildEmailHtml(bodyHtml, { preheader: body }),
    text: `${body}\n\nOpen Lyra Preparatory: ${ctaUrl}\n\nTo turn off email notifications, visit your profile settings: ${profileUrl}\n\n© Lyra Preparatory`,
  });
}
