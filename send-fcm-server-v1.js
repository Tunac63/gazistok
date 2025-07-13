// send-fcm-server-v1.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Service account json dosyasının yolu
const SERVICE_ACCOUNT_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'proje-id-buraya';

// Google Auth ile JWT oluştur
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const key = require(SERVICE_ACCOUNT_FILE);
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ['https://www.googleapis.com/auth/firebase.messaging'],
      null
    );
    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

app.post('/send-fcm', async (req, res) => {
  const { tokens, title, body } = req.body;
  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    return res.status(400).json({ error: 'Token listesi boş.' });
  }
  try {
    const accessToken = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    const results = [];
    for (const token of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body },
        },
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      const data = await response.json();
      results.push({ token, response: data });
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'FCM gönderim hatası', detail: err.message });
  }
});


// Render ve diğer platformlar için health check endpointi ekle
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log('FCM v1 sunucusu çalışıyor: http://localhost:' + PORT);
});

// Kurulum:
// 1. Google Cloud Console'dan bir service account oluşturup JSON anahtarını bu klasöre kaydet.
// 2. .env dosyasına FIREBASE_PROJECT_ID=proje-id GOOGLE_APPLICATION_CREDENTIALS=./service-account.json ekle.
// 3. npm install express body-parser cors googleapis dotenv
// 4. node send-fcm-server-v1.js
