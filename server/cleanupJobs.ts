import { prisma } from "./prisma";

/**
 * Cleanup expired verification tokens and unverified users
 * Runs periodically to remove users who haven't verified their email within 24 hours
 */
export async function cleanupExpiredVerificationTokens() {
  try {
    const now = new Date();
    
    // Delete users with expired verification tokens who haven't verified their email
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: false,
        verificationTokenExpiry: {
          not: null,
          lt: now,
        },
      },
    });

    if (result.count > 0) {
      console.log(`[cleanup] Deleted ${result.count} unverified user(s) with expired tokens`);
    }

    return result.count;
  } catch (error) {
    console.error('[cleanup] Error cleaning up expired verification tokens:', error);
    throw error;
  }
}

/**
 * Cleanup expired password reset tokens
 * Removes expired tokens but keeps the user account
 */
export async function cleanupExpiredPasswordResetTokens() {
  try {
    const now = new Date();
    
    // Clear expired password reset tokens (but keep the user)
    const result = await prisma.user.updateMany({
      where: {
        passwordResetTokenExpiry: {
          not: null,
          lt: now,
        },
      },
      data: {
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    if (result.count > 0) {
      console.log(`[cleanup] Cleared ${result.count} expired password reset token(s)`);
    }

    return result.count;
  } catch (error) {
    console.error('[cleanup] Error cleaning up expired password reset tokens:', error);
    throw error;
  }
}

/**
 * Run all cleanup jobs
 */
export async function runCleanupJobs() {
  try {
    console.log('[cleanup] Running cleanup jobs...');
    await cleanupExpiredVerificationTokens();
    await cleanupExpiredPasswordResetTokens();
    console.log('[cleanup] Cleanup jobs completed');
  } catch (error) {
    console.error('[cleanup] Error running cleanup jobs:', error);
  }
}

/**
 * Schedule cleanup jobs to run periodically
 * Default: every 6 hours
 */
export function scheduleCleanupJobs(intervalHours: number = 6) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  // Run immediately on startup (wrapped in catch to prevent unhandled rejections)
  runCleanupJobs().catch(error => {
    console.error('[cleanup] Initial cleanup job failed:', error);
  });
  
  // Then schedule to run periodically
  setInterval(() => {
    runCleanupJobs().catch(error => {
      console.error('[cleanup] Scheduled cleanup job failed:', error);
    });
  }, intervalMs);
  
  console.log(`[cleanup] Scheduled cleanup jobs to run every ${intervalHours} hours`);
}
