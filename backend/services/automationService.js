import nodemailer from 'nodemailer';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Configure Email Transporter (Nodemailer)
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Configure Twilio Client (WhatsApp)
 */
const twilioClient = (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send Confirmation Email
 */
export const sendReservationEmail = async (reservation) => {
  const hasCreds = process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!hasCreds) {
    console.log('--- [SIMULATED EMAIL] ---');
    console.log(`To: ${reservation.name} (${reservation.phone})`);
    console.log(`Subject: Reservation Confirmed at Savory`);
    console.log(`Message: Your table for ${reservation.guests} guests is confirmed for ${reservation.date} at ${reservation.time}.`);
    return;
  }

  const mailOptions = {
    from: `"Savory Restaurant" <${process.env.EMAIL_USER}>`,
    to: reservation.email || 'guest@example.com',
    subject: '🍴 Your Savory Experience is Confirmed!',
    html: `
      <div style="font-family: 'Inter', sans-serif; background-color: #0b0b0b; color: white; padding: 40px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
        <h1 style="color: #ff824d; font-style: italic; margin-bottom: 20px;">SAVORY</h1>
        <p style="font-size: 16px;">Dear ${reservation.name},</p>
        <p style="color: rgba(255,255,255,0.6);">Your reservation has been successfully confirmed. We are excited to host you for a cinematic dining experience.</p>

        <div style="background-color: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; margin: 30px 0; border: 1px solid rgba(255,255,255,0.05);">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: rgba(255,255,255,0.4); text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em;">Date</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700;">${reservation.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: rgba(255,255,255,0.4); text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em;">Time</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700;">${reservation.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: rgba(255,255,255,0.4); text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em;">Guests</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700;">${reservation.guests} People</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: rgba(255,255,255,0.4); text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.2em;">Table</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #ff824d;">#${reservation.tableId || 'Assigned on arrival'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: rgba(255,255,255,0.3); text-align: center; margin-top: 40px;">
          If you need to change your plans, please contact our concierge at +1 234 567 890.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[AUTOMATION] Email sent to ${reservation.name}`);
  } catch (error) {
    console.error('[AUTOMATION] Email Error:', error);
  }
};

/**
 * Send WhatsApp Message
 */
export const sendWhatsAppNotification = async (phone, message) => {
  if (!twilioClient) {
    console.log('--- [SIMULATED WHATSAPP] ---');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    return;
  }

  try {
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE || '+14155238886'}`,
      to: `whatsapp:${formattedPhone}`,
      body: message
    });
    console.log(`[AUTOMATION] WhatsApp sent to ${phone}`);
  } catch (error) {
    console.error('[AUTOMATION] WhatsApp Error:', error);
  }
};

/**
 * Send Digital Bill via WhatsApp
 */
export const sendBillNotification = async (order) => {
  const message = `🍴 *SAVORY RESTAURANT* \n\nHello ${order.customerName}, thanks for dining with us! \n\n*Order:* ${order.orderNumber} \n*Total:* $${order.totalAmount.toFixed(2)} \n\nWe hope to see you again soon for another culinary journey!`;

  await sendWhatsAppNotification(order.customerPhone || 'Guest', message);
};

/**
 * Send Waitlist Notification
 */
export const sendWaitlistNotification = async (entry) => {
  const message = `🔔 *SAVORY WAITLIST* \n\nHello ${entry.name}, your table for ${entry.partySize} is now ready! \n\nPlease head to the entrance within 5 minutes. We are excited to serve you!`;
  await sendWhatsAppNotification(entry.phone, message);
};

/**
 * Send Low Stock Alert to Admin Email
 */
export const sendLowStockAlert = async (ingredient) => {
    if (!process.env.EMAIL_USER) return;

    const mailOptions = {
      from: `"Savory System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to admin
      subject: `🚨 LOW STOCK ALERT: ${ingredient.name}`,
      text: `Alert: The ingredient "${ingredient.name}" has reached its minimum stock level. \n\nCurrent Stock: ${ingredient.currentStock} ${ingredient.unit} \nThreshold: ${ingredient.minStockLevel} ${ingredient.unit} \n\nPlease initiate procurement soon.`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[AUTOMATION] Low stock alert sent for ${ingredient.name}`);
    } catch (error) {
      console.error('[AUTOMATION] stock alert error:', error);
    }
};
