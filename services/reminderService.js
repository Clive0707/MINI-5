const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../database/models/User');
const Reminder = require('../database/models/Reminder');

class ReminderService {
  constructor() {
    this.transporter = this.createTransporter();
    this.scheduleJobs();
  }

  createTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Warning: EMAIL_USER or EMAIL_PASS not set in .env. Emails will not be sent.');
      return {
        sendMail: async () => {
          console.log('Skipping email send because credentials are not configured.');
        }
      };
    }

    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // bypass self-signed certificate errors (ESOCKET CONN)
        rejectUnauthorized: false
      }
    });
  }

  scheduleJobs() {
    // Check every minute for users who have a matching reminder time
    cron.schedule('* * * * *', () => {
      this.checkReminders();
    });
  }

  async checkReminders() {
    try {
      const now = new Date();
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hour}:${minute}`;
      const todayString = now.toISOString().split('T')[0];

      // Also check the old User schema logic for backward compatibility
      const legacyUsers = await User.find({
        reminderEnabled: true,
        reminderTime: currentTime
      }).lean();

      for (const user of legacyUsers) {
        const lastSent = user.lastReminderSentAt ? new Date(user.lastReminderSentAt) : null;
        const lastSentDay = lastSent ? lastSent.toISOString().split('T')[0] : null;
        if (lastSentDay === todayString) continue;

        await this.sendReminder(user.email, user.first_name);
        await User.findByIdAndUpdate(user._id, { lastReminderSentAt: now });
      }

      // Check the new Reminder collection
      const reminders = await Reminder.find({ time: currentTime }).populate('userId');
      for (const reminder of reminders) {
        const lastSent = reminder.lastSentAt ? new Date(reminder.lastSentAt) : null;
        const lastSentDay = lastSent ? lastSent.toISOString().split('T')[0] : null;
        if (lastSentDay === todayString) continue;

        const firstName = reminder.userId ? reminder.userId.first_name : 'there';
        await this.sendReminder(reminder.email, firstName);
        
        reminder.lastSentAt = now;
        await reminder.save();
      }

    } catch (error) {
      console.error('❌ Reminder check error:', error);
    }
  }

  async generateEmailText(firstName) {
    const defaultText = `Hello ${firstName},<br/><br/>This is your daily reminder to check your cognitive health and complete your tests.<br/><br/>Stay consistent for better tracking.<br/><br/><i>This is not a medical diagnosis. Please consult a healthcare professional for advice.</i>`;
    
    if (!process.env.GEMINI_API_KEY) {
      return defaultText;
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Write a short, friendly, and motivational daily email reminder (max 3 sentences) for a user named ${firstName} to check their cognitive health and complete their daily tests on the Dementia Tracker app. Include the disclaimer at the very end: 'This is not a medical diagnosis. Please consult a healthcare professional for advice.' Return HTML formatting. Do not include a subject line.`;
      
      const result = await model.generateContent(prompt);
      const generatedText = result.response.text();
      return generatedText || defaultText;
    } catch (error) {
      console.error('Gemini generation failed, falling back to default:', error);
      return defaultText;
    }
  }

  async sendReminder(email, firstName) {
    try {
      const emailBody = await this.generateEmailText(firstName);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '🧠 Daily Health Reminder',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #3b82f6;">🧠 Dementia Tracker Reminder</h2>
            <div>${emailBody}</div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Open Dashboard
              </a>
            </div>
            <p style="font-size: 12px; color: #888;">Stay well,<br/>The Dementia Tracker Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Reminder sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${email}:`, error);
    }
  }

  async sendConfirmationEmail(email, time) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reminder Scheduled Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <p>Hello,</p>
            <p>You have successfully enrolled for daily reminders.</p>
            <p>You will now receive a reminder every day at <strong>${time}</strong> to check your cognitive health and complete your tests.</p>
            <p>If you did not request this, please ignore this email.</p>
            <p><i>This is not a medical diagnosis. Please consult a healthcare professional for advice.</i></p>
            <p>Thank you.</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Confirmation email sent to ${email}`);
    } catch (error) {
      console.error(`❌ Confirmation email failed for ${email}:`, error);
    }
  }
}

module.exports = new ReminderService();
