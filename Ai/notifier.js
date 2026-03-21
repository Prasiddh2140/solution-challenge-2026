const nodemailer = require('nodemailer');

// Setup your free Gmail App Password to send warning emails:
// 1. Go to your Google Account > Security
// 2. Enable 2-Step Verification, then search for "App Passwords"
// 3. Create one for "Node JS Script" and paste the 16-letter code into your .env!
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your google email (eg: piyushbaral@gmail.com)
        pass: process.env.EMAIL_PASS  // Your 16-letter App Password from Google
    }
});

async function sendDroughtWarningEmail(userEmail, location, aiResponseData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("No Email Credentials provided in .env! Skipping real email push, but the logic successfully fired!");
        return;
    }

    const mailOptions = {
        from: `"Drought Assistant AI" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `⚠️ Important: Drought Assessment for ${location}`,
        html: `<h3>Hello,</h3>
        <p>You requested email notifications for AI drought predictions in <b>${location}</b>.</p>
        <p>Our Agricultural AI has processed the data. Here is the analysis:</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
            <p>${aiResponseData.replace(/\n/g, '<br>')}</p>
        </div>
        <br/><p>Stay alert and stay safe,<br/><b>Solution Challenge 2026 Team</b></p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Successfully sent email warning to user: ${userEmail}`);
    } catch (err) {
        console.error("Failed to send email to user:", err);
    }
}

module.exports = { sendDroughtWarningEmail };
