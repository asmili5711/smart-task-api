const sgMail = require("@sendgrid/mail");
const logger = require("../config/logger");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ================= SEND EMAIL =================
const sendEmail = async ({ to, subject, html }) => {
  try {
    const msg = {
      to,
      from: process.env.EMAIL_FROM,
      subject,
      html,
    };

    await sgMail.send(msg);
    logger.info(`Email sent to: ${to} | subject: ${subject}`);
  } catch (error) {
    logger.error(`Email send failed to: ${to} | error: ${error.message}`);
    throw error;
  }
};

// ================= EMAIL TEMPLATES =================

// Task Created Email
const taskCreatedEmail = (userName, taskTitle) => ({
  subject: `New Task Assigned: ${taskTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #4A90E2;">New Task Assigned to You</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>A new task has been created and assigned to you:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
        <h3 style="color: #333;">${taskTitle}</h3>
      </div>
      <p>Please login to your dashboard to view the full task details.</p>
      <br/>
      <p style="color: #888;">Smart Task API</p>
    </div>
  `,
});

// Task Assigned Email
const taskAssignedEmail = (userName, taskTitle) => ({
  subject: `Task Assigned to You: ${taskTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #4A90E2;">Task Assigned to You</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>The following task has been assigned to you:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
        <h3 style="color: #333;">${taskTitle}</h3>
      </div>
      <p>Please login to your dashboard to view the full task details.</p>
      <br/>
      <p style="color: #888;">Smart Task API</p>
    </div>
  `,
});

// Daily Reminder Email
const dailyReminderEmail = (userName, taskTitle) => ({
  subject: `Reminder: Task Due Soon - ${taskTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #E2A04A;">Task Due Reminder</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>This is a reminder that the following task is due:</p>
      <div style="background: #fff8e1; padding: 15px; border-radius: 8px;">
        <h3 style="color: #333;">${taskTitle}</h3>
      </div>
      <p>Please login to your dashboard and update the task status.</p>
      <br/>
      <p style="color: #888;">Smart Task API</p>
    </div>
  `,
});

// Overdue Alert Email
const overdueEmail = (userName, taskTitle) => ({
  subject: `⚠️ Overdue Task: ${taskTitle}`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #E24A4A;">Task Overdue Alert</h2>
      <p>Hi <strong>${userName}</strong>,</p>
      <p>The following task is now overdue:</p>
      <div style="background: #ffe8e8; padding: 15px; border-radius: 8px;">
        <h3 style="color: #333;">${taskTitle}</h3>
      </div>
      <p>Please login to your dashboard and update the task status immediately.</p>
      <br/>
      <p style="color: #888;">Smart Task API</p>
    </div>
  `,
});

module.exports = {
  sendEmail,
  taskCreatedEmail,
  taskAssignedEmail,
  dailyReminderEmail,
  overdueEmail,
};