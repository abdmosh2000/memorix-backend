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

/**
 * Send a gift subscription notification
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} subscriptionType - Subscription plan (premium/vip)
 * @param {number} durationMonths - Duration of gift subscription in months
 * @param {string} message - Optional custom message
 * @returns {Promise<Object>} - Email send result
 */
async function sendGiftSubscriptionEmail(email, name, subscriptionType, durationMonths, message = '') {
  const planName = subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">You've Received a Gift!</h2>
      <p>Hello ${name},</p>
      <p>Congratulations! You've been gifted a <strong>${planName}</strong> subscription to Memorix for <strong>${durationMonths} ${durationMonths === 1 ? 'month' : 'months'}</strong>!</p>
      <p>This gift includes:</p>
      <ul>
        ${subscriptionType === 'premium' ? `
          <li>Multiple capsules creation</li>
          <li>Media upload capabilities</li>
          <li>Advanced scheduling options</li>
        ` : `
          <li>Unlimited capsules creation</li>
          <li>Premium media storage</li>
          <li>Advanced encryption & security</li>
          <li>Priority support</li>
        `}
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.frontend.url}/dashboard" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Start Using Your Subscription
        </a>
      </div>
      <p>Your subscription has been automatically applied to your account.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: `You've received a gift subscription to Memorix!`,
    html: html
  });
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
 * Send an email notification when user role has been changed
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @param {string} role - The new role assigned to the user
 * @returns {Promise<Object>} - Email send result
 */
async function sendRoleChangeEmail(email, name, role) {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  
  const roleDescription = {
    'admin': 'Full access to the administrative dashboard, user management, and all system features',
    'moderator': 'Ability to manage content, approve items, and maintain community standards',
    'content_curator': 'Responsibility for curating and featuring content across the platform',
    'user': 'Standard user access for creating and managing personal content'
  };
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">Your Role Has Been Updated</h2>
      <p>Hello ${name},</p>
      <p>Your role at Memorix has been updated to: <strong>${roleDisplay}</strong></p>
      <p>This role provides you with the following access:</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Role Description:</strong></p>
        <p>${roleDescription[role] || 'Standard access to Memorix features'}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.frontend.url}/dashboard" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Go to Dashboard
        </a>
      </div>
      <p>If you have any questions about your new permissions, please contact our support team.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Your Memorix Role Has Been Updated",
    html: html
  });
}

/**
 * Send a notification when an admin manually verifies a user's email
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @returns {Promise<Object>} - Email send result
 */
async function sendAdminVerificationEmail(email, name) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${config.frontend.url}/logo.png" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">Your Email Has Been Verified</h2>
      <p>Hello ${name},</p>
      <p>Your account email has been manually verified by a Memorix administrator.</p>
      <p>Your account is now fully activated and you can enjoy all the features of Memorix!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${config.frontend.url}/dashboard" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Go to Dashboard
        </a>
      </div>
      <p>Thank you for being part of the Memorix community!</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: "Your Memorix Account Has Been Verified",
    html: html
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendGiftSubscriptionEmail,
  sendRoleChangeEmail,
  sendAdminVerificationEmail
};
