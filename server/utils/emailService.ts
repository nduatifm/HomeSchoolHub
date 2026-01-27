import nodemailer from 'nodemailer';

// Validate SMTP configuration
function validateSmtpConfig() {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  SMTP Configuration missing: ${missing.join(', ')}`);
    console.warn('Email sending will not work. Please set these environment variables.');
    return false;
  }
  return true;
}

const smtpConfigValid = validateSmtpConfig();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter connection in production
if (smtpConfigValid && process.env.NODE_ENV === 'production') {
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP Connection Error:', error.message);
      console.error('Email service may not work properly');
    } else if (success) {
      console.log('✅ SMTP Connection verified successfully');
    }
  });
}

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
  if (!smtpConfigValid) {
    console.error('❌ Cannot send verification email: SMTP not configured');
    return { success: false, error: 'Email service not configured' };
  }

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
    console.log(`📧 Sending verification email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"Tutoring Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: htmlContent,
      text: `Hi ${name}, please verify your email: ${verificationUrl}`,
    });
    console.log(`✅ Verification email sent successfully. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Verification email send error:', {
      email,
      error: error.message,
      code: error.code,
      command: error.command,
    });
    return { success: false, error: error.message };
  }
}

export async function sendStudentInviteEmail(
  email: string, 
  studentName: string, 
  inviteCode: string,
  parentName: string
) {
  if (!smtpConfigValid) {
    console.error('❌ Cannot send student invite email: SMTP not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl();
  const signupUrl = `${baseUrl}/student-signup`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Invitation</title>
</head>
<body style="margin:0; padding:20px; font-family:Arial,sans-serif; background:#f4f4f4;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; padding:40px; border-radius:8px;">
    <h2 style="color:#333; margin-bottom:20px;">Welcome to Tutoring Platform, ${studentName}!</h2>
    <p style="color:#666; font-size:16px; line-height:1.5;">
      ${parentName} has invited you to join the Tutoring Platform as a student.
    </p>
    <p style="color:#666; font-size:16px; line-height:1.5;">
      To complete your registration, please visit the signup page and use your invite code.
    </p>
    <div style="text-align:center; margin:30px 0;">
      <a href="${signupUrl}" 
         style="display:inline-block; background:#10b981; color:#ffffff; 
                padding:14px 30px; text-decoration:none; border-radius:5px; 
                font-weight:bold;">
        Go to Student Signup
      </a>
    </div>
    <div style="background:#f8f9fa; padding:20px; border-radius:8px; text-align:center; margin:20px 0;">
      <p style="color:#666; font-size:14px; margin-bottom:10px;">Your Invite Code:</p>
      <p style="color:#333; font-size:24px; font-weight:bold; font-family:monospace; letter-spacing:2px; margin:0;">
        ${inviteCode}
      </p>
    </div>
    <p style="color:#999; font-size:14px;">
      This invite expires in 7 days. Copy the invite code above and paste it on the signup page.
    </p>
    <p style="color:#999; font-size:12px; margin-top:30px; border-top:1px solid #eee; padding-top:20px;">
      Signup URL: ${signupUrl}
    </p>
  </div>
</body>
</html>
  `;

  try {
    console.log(`📧 Sending student invite email to: ${email} for student: ${studentName}`);
    const info = await transporter.sendMail({
      from: `"Tutoring Platform" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'You have been invited to Tutoring Platform',
      html: htmlContent,
      text: `Hi ${studentName}, ${parentName} has invited you to join Tutoring Platform. Visit ${signupUrl} and use invite code: ${inviteCode}`,
    });
    console.log(`✅ Student invite email sent successfully. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Student invite email send error:', {
      email,
      studentName,
      error: error.message,
      code: error.code,
      command: error.command,
    });
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  if (!smtpConfigValid) {
    console.error('❌ Cannot send password reset email: SMTP not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  try {
    console.log(`📧 Sending password reset email to: ${email}`);
    const info = await transporter.sendMail({
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
    console.log(`✅ Password reset email sent successfully. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Password reset email send error:', {
      email,
      error: error.message,
      code: error.code,
      command: error.command,
    });
    return { success: false, error: error.message };
  }
}
