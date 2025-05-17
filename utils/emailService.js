const { Resend } = require('resend');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

// Initialize Resend with API key from config
console.log('Initializing Resend email service');

// Read and convert logo to base64 for embedding in emails
let logoBase64;
try {
  // Use the smaller chrome logo which is better suited for emails
  const logoPath = path.join(__dirname, '../../frontend/public/favicon_io/android-chrome-192x192.png');
  const logo = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${Buffer.from(logo).toString('base64')}`;
  console.log('Logo loaded and converted to base64 for email embedding');
} catch (error) {
  console.error('Failed to load logo for email embedding:', error);
  // Fallback to remote URL if loading fails
  logoBase64 = 'https://memorix.fun/logo.png';
}
const resendApiKey = process.env.RESEND_API_KEY || config.email.resendApiKey;
console.log('Using API Key:', resendApiKey ? 'API key is set' : 'API key is missing');

const resend = new Resend(resendApiKey);
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
  
  // Test mode - log the email instead of sending it
  if (config.email && config.email.testMode) {
    console.log('📧 TEST MODE - Email would be sent with these details:');
    console.log(`From: ${from}`);
    console.log(`To: ${config.email.testRecipient || to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML content length: ${html ? html.length : 0} characters`);
    console.log('Content preview:', html ? html.substring(0, 150) + '...' : 'No HTML content');
    
    // In test mode, we pretend the email was sent successfully
    return { id: 'test-email-id-' + Date.now(), testMode: true };
  }
  
  let lastError;
  
  // Try to send the email with exponential backoff retries
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const data = await resend.emails.send({
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text || stripHtml(html)
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
        <img src="${logoBase64}" alt="Memorix Logo" style="max-width: 180px;">
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
    subject: 'Please verify your email address',
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
        <img src="${logoBase64}" alt="Memorix Logo" style="max-width: 180px;">
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
    subject: 'Reset your password',
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
          <img src="${logoBase64}" alt="Memorix Logo" style="max-width: 150px;">
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
        <img src="${logoBase64}" alt="Memorix Logo" style="max-width: 150px;">
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
    subject: 'Welcome to Memorix!',
    html: html
  });
}

/**
 * Send a notification about a released capsule
 * @param {string} email - Recipient's email address
 * @param {string} subject - Email subject
 * @param {string} capsuleTitle - Title of the capsule
 * @param {string} creatorName - Name of the creator (optional for creator notifications)
 * @param {Date} releaseDate - Release date of the capsule
 * @param {string} content - Decrypted content of the capsule
 * @param {string} capsuleId - ID of the capsule (for generating secure media URLs)
 * @param {string} mediaType - Type of media (photo, video, audio) if any
 * @param {boolean} isCreator - Whether the recipient is the creator
 * @returns {Promise<Object>} - Email send result
 */
async function sendCapsuleReleasedNotification(email, subject, capsuleTitle, creatorName, releaseDate, content, capsuleId, mediaType, isCreator) {
  // Import the media controller when needed to avoid circular dependencies
  const { generateMediaUrl } = require('../controllers/mediaController');
  
  // Format the release date in a readable format
  const formattedReleaseDate = new Date(releaseDate).toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Ensure content is displayed properly (never truncated)
  const formattedContent = content || 'No text content';
  
  // Handle media content based on type
  let mediaSection = '';
  if (mediaType) {
    try {
      // Generate secure URL for viewing the media directly
      const mediaUrl = generateMediaUrl(capsuleId, mediaType);
      
      // Create appropriate media section based on type
      if (mediaType === 'image') {
        mediaSection = `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${mediaUrl}" alt="Capsule image" style="max-width: 100%; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          </div>
        `;
      } else if (mediaType === 'video') {
        mediaSection = `
          <div style="text-align: center; margin: 20px 0;">
            <p><a href="${mediaUrl}" target="_blank" style="background-color: #8E44AD; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Video</a></p>
            <p style="font-size: 12px; color: #666;">Video content cannot be viewed directly in email. Click the button to view.</p>
          </div>
        `;
      } else if (mediaType === 'audio') {
        mediaSection = `
          <div style="text-align: center; margin: 20px 0;">
            <p><a href="${mediaUrl}" target="_blank" style="background-color: #8E44AD; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Listen to Audio</a></p>
            <p style="font-size: 12px; color: #666;">Audio content cannot be played directly in email. Click the button to listen.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to generate media URL for capsule:', err);
      mediaSection = `
        <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f8f8f8; border-radius: 4px;">
          <p style="color: #666;">This capsule contains media that cannot be displayed in this email.</p>
          <a href="${config.frontend.url}/capsules/${capsuleId}" style="color: #8E44AD; text-decoration: none;">View on Memorix</a>
        </div>
      `;
    }
  }
  
  // Construct the viewUrl for the capsule
  const viewUrl = `${config.frontend.url}/capsules/${capsuleId}`;
  
  // Different greeting based on whether it's the creator or a recipient
  const greeting = isCreator 
    ? `<p>Hello,</p><p>Your time capsule has been opened!</p>` 
    : `<p>Hello,</p><p>${creatorName} has shared a memory with you that has now been unlocked!</p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${logoBase64}" alt="Memorix Logo" style="max-width: 150px;">
      </div>
      <h2 style="color: #8E44AD; text-align: center;">A Memory Has Been Revealed!</h2>
      <div style="background-color: #f9f0ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
        ${greeting}
      </div>
      <h3 style="color: #333; text-align: center;">${capsuleTitle}</h3>
      <p>Released on: <strong>${formattedReleaseDate}</strong></p>
      
      <!-- Content Section -->
      <div style="margin: 25px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px; border-left: 4px solid #8E44AD;">
        <p style="white-space: pre-wrap;">${formattedContent}</p>
      </div>
      
      <!-- Media Section -->
      ${mediaSection}
      
      <!-- View Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewUrl}" style="background-color: #8E44AD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          View Full Memory
        </a>
      </div>
      
      <p>This memory has been preserved by Memorix and is now unlocked for you to experience.</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Memorix. All rights reserved.</p>
        <p>Our address: memorix.fun</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject: subject,
    html: html
  });
}

// Export all email functions
module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCapsuleInvitation,
  sendWelcomeEmail,
  sendCapsuleReleasedNotification
};
