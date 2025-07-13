// Basit Express sunucusu ile FCM bildirim gönderme
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// FCM sunucu anahtarınızı buraya ekleyin (Firebase Console > Project Settings > Cloud Messaging > Server key)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || 'BURAYA_FCM_SERVER_KEY_YAZIN';

app.post('/send-fcm', async (req, res) => {
  const { tokens, title, body } = req.body;
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ error: 'Token listesi boş.' });
  }
  const message = {
    registration_ids: tokens,
    notification: {
      title: title || 'Bildirim',
      body: body || '',
    },
  };
  try {
    const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'key=' + FCM_SERVER_KEY,
      },
      body: JSON.stringify(message),
    });
    const data = await fcmRes.json();
    if (data.failure > 0) {
      return res.status(200).json({ success: false, detail: data });
    }
    res.json({ success: true, detail: data });
  } catch (err) {
    res.status(500).json({ error: 'FCM gönderim hatası', detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('FCM sunucusu çalışıyor: http://localhost:' + PORT);
});

// .env dosyasına FCM_SERVER_KEY=... eklemeyi unutmayın!
