const nodemailer = require('nodemailer');
const cron = require('node-cron');
const User = require('../database/models/User');

class ReminderService {
  constructor() {
    this.transporter = this.createTransporter();
    this.scheduleJobs();
  }

  createTransporter() {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  scheduleJobs() {
    // Check every 5 minutes for users who have a matching reminder time
    cron.schedule('*/5 * * * *', () => {
      this.checkReminders();
    });
  }

  async checkReminders() {
    try {
      const now = new Date();
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hour}:${minute}`;
      const today = now.toISOString().split('T')[0];

      const users = await User.find({
        reminderEnabled: true,
        reminderTime: currentTime
      }).lean();

      for (const user of users) {
        // Avoid sending multiple reminders in the same day
        const lastSent = user.lastReminderSentAt ? new Date(user.lastReminderSentAt) : null;
        const lastSentDay = lastSent ? lastSent.toISOString().split('T')[0] : null;
        if (lastSentDay === today) continue;

        await this.sendReminder(user);
        await User.findByIdAndUpdate(user._id, { lastReminderSentAt: now });
      }
    } catch (error) {
      console.error('❌ Reminder check error:', error);
    }
  }

  async sendReminder(user) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '🧠 Cognitive Test Reminder - Dementia Tracker',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">🧠 Dementia Tracker Reminder</h2>
            <p>Hi ${user.first_name},</p>
            <p>This is a friendly reminder to complete your daily cognitive test.</p>
            <p><strong>Reminder time:</strong> ${user.reminderTime}</p>
            <p>Regular cognitive testing helps you track changes over time and stay on top of your brain health.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tests" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🧠 Take a test now
              </a>
            </div>
            <p>If you'd like to change your reminder settings, log in to your Dementia Tracker account and update your preferences.</p>
            <p>Stay well,<br/>The Dementia Tracker Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Reminder sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder to ${user.email}:`, error);
    }
  }
}

module.exports = new ReminderService();
