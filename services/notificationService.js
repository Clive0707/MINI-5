const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { getDatabase } = require('../database/init');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
    this.setupCronJobs();
  }

  initTransporter() {
    // For development, use a test account or configure with real SMTP
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // or your preferred email service
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });
  }

  setupCronJobs() {
    // Check for due tests every hour
    cron.schedule('0 * * * *', () => {
      this.checkDueTests();
    });

    // Send daily reminders at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.sendDailyReminders();
    });
  }

  async checkDueTests() {
    try {
      const db = getDatabase();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      db.all(`
        SELECT ts.*, u.email, u.first_name, u.last_name 
        FROM test_schedules ts 
        JOIN users u ON ts.user_id = u.id 
        WHERE ts.scheduled_date = ? 
        AND ts.status = 'scheduled'
        AND ts.reminder_sent = 0
      `, [today], async (err, schedules) => {
        if (err) {
          console.error('Error checking due tests:', err);
          return;
        }

        for (const schedule of schedules) {
          await this.sendTestReminder(schedule);
          
          // Mark reminder as sent
          db.run('UPDATE test_schedules SET reminder_sent = 1 WHERE id = ?', [schedule.id]);
        }
      });
    } catch (error) {
      console.error('Error in checkDueTests:', error);
    }
  }

  async sendDailyReminders() {
    try {
      const db = getDatabase();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      db.all(`
        SELECT ts.*, u.email, u.first_name, u.last_name 
        FROM test_schedules ts 
        JOIN users u ON ts.user_id = u.id 
        WHERE ts.scheduled_date = ? 
        AND ts.status = 'scheduled'
      `, [tomorrowStr], async (err, schedules) => {
        if (err) {
          console.error('Error getting tomorrow\'s tests:', err);
          return;
        }

        for (const schedule of schedules) {
          await this.sendDailyReminder(schedule);
        }
      });
    } catch (error) {
      console.error('Error in sendDailyReminders:', error);
    }
  }

  async sendTestReminder(schedule) {
    try {
      const testNames = {
        'word_recall': 'Word Recall Test',
        'stroop': 'Stroop Test',
        'pattern_recognition': 'Pattern Recognition Test'
      };

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@dementiatracker.com',
        to: schedule.email,
        subject: `🧠 Test Reminder: ${testNames[schedule.test_type] || 'Cognitive Test'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">🧠 Dementia Tracker - Test Reminder</h2>
            <p>Hello ${schedule.first_name},</p>
            <p>This is a friendly reminder that you have a <strong>${testNames[schedule.test_type] || 'Cognitive Test'}</strong> scheduled for today.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📅 Test Details:</h3>
              <p><strong>Test Type:</strong> ${testNames[schedule.test_type] || 'Cognitive Test'}</p>
              <p><strong>Scheduled Time:</strong> ${schedule.scheduled_time || 'Anytime today'}</p>
              <p><strong>Duration:</strong> Approximately 5-10 minutes</p>
            </div>
            <p>Taking regular cognitive tests helps track your brain health and can provide early insights into cognitive changes.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/tests" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🚀 Take Test Now
              </a>
            </div>
            <p>If you have any questions or need to reschedule, please log into your account.</p>
            <p>Best regards,<br>The Dementia Tracker Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Test reminder sent to ${schedule.email}`);
    } catch (error) {
      console.error('Error sending test reminder:', error);
    }
  }

  async sendDailyReminder(schedule) {
    try {
      const testNames = {
        'word_recall': 'Word Recall Test',
        'stroop': 'Stroop Test',
        'pattern_recognition': 'Pattern Recognition Test'
      };

      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@dementiatracker.com',
        to: schedule.email,
        subject: `📅 Tomorrow's Test: ${testNames[schedule.test_type] || 'Cognitive Test'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">📅 Dementia Tracker - Tomorrow's Test</h2>
            <p>Hello ${schedule.first_name},</p>
            <p>This is a friendly reminder that you have a <strong>${testNames[schedule.test_type] || 'Cognitive Test'}</strong> scheduled for tomorrow.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📅 Test Details:</h3>
              <p><strong>Test Type:</strong> ${testNames[schedule.test_type] || 'Cognitive Test'}</p>
              <p><strong>Scheduled Date:</strong> Tomorrow</p>
              <p><strong>Scheduled Time:</strong> ${schedule.scheduled_time || 'Anytime'}</p>
              <p><strong>Duration:</strong> Approximately 5-10 minutes</p>
            </div>
            <p>Regular cognitive testing is important for monitoring your brain health. Set aside some time tomorrow to complete this test.</p>
            <p>Best regards,<br>The Dementia Tracker Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Daily reminder sent to ${schedule.email}`);
    } catch (error) {
      console.error('Error sending daily reminder:', error);
    }
  }

  async sendTestCompletionNotification(user, testResult) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@dementiatracker.com',
        to: user.email,
        subject: `🎉 Test Completed: ${testResult.test_type} - Score: ${testResult.score}/10`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">🎉 Test Completed Successfully!</h2>
            <p>Hello ${user.first_name},</p>
            <p>Great job! You've completed your <strong>${testResult.test_type}</strong> test.</p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📊 Test Results:</h3>
              <p><strong>Test Type:</strong> ${testResult.test_type}</p>
              <p><strong>Score:</strong> ${testResult.score}/10</p>
              <p><strong>Completion Time:</strong> ${new Date(testResult.completed_at).toLocaleString()}</p>
            </div>
            <p>Keep up the great work! Regular testing helps track your cognitive health over time.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                 style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 View Dashboard
              </a>
            </div>
            <p>Best regards,<br>The Dementia Tracker Team</p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Test completion notification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending test completion notification:', error);
    }
  }
}

module.exports = new NotificationService();
