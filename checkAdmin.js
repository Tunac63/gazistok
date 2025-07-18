// Admin durumunu kontrol etmek ve ayarlamak için geçici script

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');

// Firebase config
const firebaseConfig = {
  // Bu konfigürasyonu src/firebase/config.js dosyasından alın
  apiKey: "AIzaSyDQSYe_z9bVLFPq8VuJ-9V9wLFd-7P8ZbE",
  authDomain: "gazistok-3e123.firebaseapp.com",
  databaseURL: "https://gazistok-3e123-default-rtdb.firebaseio.com",
  projectId: "gazistok-3e123",
  storageBucket: "gazistok-3e123.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkAndSetAdmin() {
  try {
    console.log('🔍 Mevcut admin kayıtları kontrol ediliyor...');
    
    const adminsRef = ref(db, 'admins');
    const snapshot = await get(adminsRef);
    
    if (snapshot.exists()) {
      console.log('👥 Mevcut adminler:', snapshot.val());
    } else {
      console.log('❌ Hiç admin kaydı bulunamadı');
    }
    
    // Yeni admin eklemek için bu satırı uncomment edin ve UID'nizi girin:
    // const userUID = 'USER_UID_BURAYA_GIRIN';
    // await set(ref(db, `admins/${userUID}`), { role: 'admin', addedAt: Date.now() });
    // console.log('✅ Admin eklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

checkAndSetAdmin();
