import nodemailer from 'nodemailer';

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
  // Check for explicit CLIENT_URL environment variable first
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL;
  }
  
  // In production (Replit), use the Replit domain
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    return `https://${domains[0]}`;
  }
  
  // Fallback to localhost for development
  return 'http://localhost:5000';
}

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
</head>
<body style="margin:0; padding:20px; font-family:Arial,sans-serif; background:#f4f4f4;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:40px; border-radius:8px;">
    <h2 style="color:#333; margin-bottom:20px;">Welcome to Tutoring Platform, ${name}!</h2>
    <p style="color:#666; font-size:16px; line-height:1.5;">
      Thank you for registering. Please verify your email address to activate your account.
    </p>
    <div style="text-align:center; margin:30px 0;">
      <a href="${verificationUrl}" 
         style="display:inline-block; background:#007bff; color:#ffffff; 
                padding:14px 30px; text-decoration:none; border-radius:5px; 
                font-weight:bold;">
        Verify Email Address
      </a>
    </div>
    <p style="color:#999; font-size:14px;">
      This link expires in 24 hours. If you didn't create an account, please ignore this email.
    </p>
    <p style="color:#999; font-size:12px; margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
      Or copy and paste this URL: ${verificationUrl}
    </p>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"Tutoring Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: htmlContent,
      text: `Hi ${name}, please verify your email: ${verificationUrl}`,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  try {
    await transporter.sendMail({
      from: `"Tutoring Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      `,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Password reset email error:', error);
    return { success: false, error: error.message };
  }
}
