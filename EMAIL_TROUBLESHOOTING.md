# Email Sending Troubleshooting Guide

## Problem
Emails are not sending in production, but they work locally. No error messages are visible.

## Root Causes Fixed
I've updated your email service with the following improvements:

### 1. **SMTP Configuration Validation** ✅
- Added startup checks to verify all SMTP environment variables are set
- Added detailed error logging when SMTP credentials are missing
- Added SMTP connection verification in production

### 2. **Enhanced Error Logging** ✅
- All email functions now log with emojis and detailed context
- Email send failures now include error code and command information
- Makes it much easier to diagnose production issues

### 3. **Debugging Improvements** ✅
- Log when email is about to be sent
- Log Message ID when successfully sent
- Log full error details including SMTP error codes

## What You Need to Check in Production

### Critical: Verify These Environment Variables Are Set

```bash
# These MUST be set in your production environment
SMTP_HOST=<your-smtp-server>
SMTP_PORT=<587-or-465>
SMTP_USER=<your-email@example.com>
SMTP_PASS=<your-app-password-or-password>
CLIENT_URL=https://www.lyraprep.com
NODE_ENV=production
```

### For Different Email Providers

**Gmail (with App Password):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

**SendGrid:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
```

**AWS SES:**
```
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password
```

**Brevo (Sendinblue):**
```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASS=your-brevo-smtp-key
```

## How to Diagnose the Issue

### Step 1: Check Production Logs
After deploying, watch your production logs for these messages:

```
✅ SMTP Connection verified successfully
```
OR
```
❌ SMTP Connection Error: [error message]
❌ SMTP Configuration missing: SMTP_HOST, SMTP_USER, SMTP_PASS
```

### Step 2: Test Email Sending
When a user tries to sign up or verify email, look for:

```
📧 Sending verification email to: user@example.com
✅ Verification email sent successfully. Message ID: <id>
```

OR (if there's an error):
```
❌ Verification email send error: {
  email: 'user@example.com',
  error: 'error message',
  code: 'ERROR_CODE',
  command: 'MAIL'
}
```

### Step 3: Common SMTP Error Codes

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `ECONNREFUSED` | Can't connect to SMTP server | Check SMTP_HOST and SMTP_PORT are correct |
| `535` or `Invalid login` | Wrong credentials | Verify SMTP_USER and SMTP_PASS |
| `534` | App requires specific login method | Use App Password instead of regular password (Gmail) |
| `421` | Service temporarily unavailable | SMTP server is down, try again later |
| `550` | Message rejected | Email format or from address is invalid |

## Testing Locally

To test that your SMTP settings work before deploying:

```bash
# Run in development mode with production SMTP settings
SMTP_HOST=smtp.gmail.com \
SMTP_PORT=587 \
SMTP_USER=your-email@gmail.com \
SMTP_PASS=your-app-password \
NODE_ENV=development \
npm run dev
```

Then try signing up and check the console logs.

## If You're Using Replit in Production

Make sure you have these environment variables set in Replit Secrets:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `CLIENT_URL` (already set to https://www.lyraprep.com)

## Silent Failure Prevention

The updated code now ensures:
1. ✅ Startup validation of SMTP configuration
2. ✅ Connection verification on production startup
3. ✅ Detailed logging of every send attempt
4. ✅ Error codes and messages in logs
5. ✅ No silent failures - all errors are logged

## Next Steps

1. **Deploy the updated emailService.ts** to production
2. **Verify environment variables** are set in your production environment
3. **Check production logs** after deployment (you should see "✅ SMTP Connection verified")
4. **Test by creating a new user** - watch logs for email send confirmation or errors
5. **Share any error codes** from logs if email still doesn't work

## Need More Help?

If you still see failures after these steps, share these details:
- The exact error message from production logs
- Your SMTP provider (Gmail, SendGrid, etc.)
- Whether the error happens during send or earlier
