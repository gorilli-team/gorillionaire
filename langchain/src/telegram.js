let lastNotificationTime = 0;
const NOTIFICATION_DELAY = 1000;

// Helper function to send Telegram notification
const sendTelegramNotification = async (message) => {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramBotToken || !telegramChatId) {
    console.log("Telegram configuration missing");
    throw new Error("Telegram configuration missing");
  }

  // Add delay if needed
  const now = Date.now();
  const timeSinceLastNotification = now - lastNotificationTime;
  if (timeSinceLastNotification < NOTIFICATION_DELAY) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOTIFICATION_DELAY - timeSinceLastNotification)
    );
  }

  const encodedMessage = encodeURIComponent(message);
  const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${telegramChatId}&text=${encodedMessage}&parse_mode=HTML`;

  const response = await fetch(telegramUrl);
  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  lastNotificationTime = Date.now();
};

export default sendTelegramNotification;
