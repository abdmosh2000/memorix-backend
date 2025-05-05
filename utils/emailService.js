const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || 're_gzsvPCdQ_MD8UtQpXBvvoXqZeQcrgajTG');
const config = require('../config/config');

/**
 * Send an email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @param {string} [options.text] - Plain text content (fallback)
 * @param {string} [options.from] - Sender email (defaults to the configured from address)
 * @param {number} [options.retries=3] - Number of retry attempts for failed sends
 * @returns {Promise<Object>} - Email send result
 */
async function sendEmail(options) {
  const { to, subject, html, text, from = config.email.from, retries = 3 } = options;
  
  let lastError;
  
  // Try to send the email with exponential backoff retries
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const data = await resend.emails.send({
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text || stripHtml(html),
      });
      
      console.log(`Email sent successfully to ${to}, ID: ${data.id}`);
      return data;
    } catch (error) {
      lastError = error;
      console.error(`Email send attempt ${attempt + 1} failed:`, error);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < retries - 1) {
        // Exponential backoff: wait longer between each retry
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we've exhausted all retries, log and throw the last error
  console.error(`Email to ${to} failed after ${retries} attempts:`, lastError);
  throw lastError;
}

/**
 * Helper function to strip HTML for plain text emails
 * @param {string} html - HTML content
 * @returns {string} - Plain text content
 */
function stripHtml(html) {
  // Simple regex to remove HTML tags
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Send a verification email to a newly registered user
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - Email send result
 */
async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${config.frontend.url}/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">Verify Your Email Address</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with Memorix! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Verify My Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't register for Memorix, you can safely ignore this email.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Please verify your email address",
    html: html
  });
}

/**
 * Send a password reset email
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} token - Reset token
 * @returns {Promise<Object>} - Email send result
 */
async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">Reset Your Password</h2>
      <p>Hello ${name},</p>
      <p>You recently requested to reset your password for your Memorix account. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all;">${resetUrl}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Reset your password",
    html: html
  });
}

/**
 * Send a notification to recipients about a new memory capsule
 * @param {Array<string>} recipients - Array of recipient email addresses
 * @param {string} capsuleId - ID of the capsule
 * @param {string} title - Title of the capsule
 * @param {string} senderName - Name of the person who created the capsule
 * @param {Date} releaseDate - When the capsule will be released
 * @returns {Promise<Array>} - Array of email send results
 */
async function sendCapsuleInvitation(recipients, capsuleId, title, senderName, releaseDate) {
  if (!recipients || recipients.length === 0) {
    return [];
  }
  
  // Format the release date in a readable format
  const formattedReleaseDate = new Date(releaseDate).toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const results = [];
  
  // Get the URL for viewing the capsule
  const viewUrl = `${config.frontend.url}/capsules/${capsuleId}`;
  
  // Send an email to each recipient
  for (const recipient of recipients) {
    const recipientEmail = typeof recipient === 'string' ? recipient : recipient.email;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
        </div>
        <h2 style="color: #8E44AD; text-align: center;">A Memory Has Been Shared With You!</h2>
        <div style="background-color: #f9f0ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="font-size: 18px; margin: 0;">
            <span style="display: block; font-weight: bold; margin-bottom: 5px;">${senderName}</span>
            has included you in a time capsule memory
          </p>
        </div>
        <p>This memory titled <strong>"${title}"</strong> will be revealed to you on:</p>
        <p style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 18px; font-weight: bold;">${formattedReleaseDate}</p>
        <p>On the release date, you'll receive another notification with a link to access this special memory.</p>
        <p>The sender has thoughtfully chosen to share this moment with you. We'll keep it safe until it's time for you to experience it.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
          <p>Our address: memorix.fun</p>
        </div>
      </div>
    `;
    
    try {
      const result = await sendEmail({
        to: recipientEmail,
        subject: `${senderName} has included you in a time capsule memory!`,
        html: html
      });
      results.push(result);
    } catch (err) {
      console.error(`Failed to send capsule invitation to ${recipientEmail}:`, err);
      results.push({ error: err, recipient: recipientEmail });
    }
  }
  
  return results;
}

/**
 * Send a welcome email after verification
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @returns {Promise<Object>} - Email send result
 */
async function sendWelcomeEmail(email, name) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">Welcome to Memorix!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for verifying your email address and joining the Memorix community!</p>
      <p>With your account, you can now:</p>
      <ul>
        <li>Create and store memories in time capsules</li>
        <li>Share them with friends and family</li>
        <li>Set future release dates for your memories</li>
        <li>Explore other public memory capsules</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.frontend.url}/dashboard" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Go to Dashboard
        </a>
      </div>
      <p>We're excited to have you with us and can't wait to see what memories you'll preserve!</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Welcome to Memorix!",
    html: html
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendCapsuleInvitation
};
