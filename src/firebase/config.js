// src/firebase/config.js (Realtime Database uyumlu)

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database"; // Realtime için bu
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAKfvYLMvgvjEm70cTsv0hGu1Ut_2fZIU8",
  authDomain: "gazistok.firebaseapp.com",
  databaseURL: "https://gazistok-default-rtdb.europe-west1.firebasedatabase.app", // ✅ Doğru bölge
  projectId: "gazistok",
  storageBucket: "gazistok.firebasestorage.app",
  messagingSenderId: "1003165730366",
  appId: "1:1003165730366:web:8d2314c04ddb69bcd7336f",
  measurementId: "G-JQ98CHJC3B"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app); // ✅ Realtime Database
export const messaging = getMessaging(app);
export const storage = getStorage(app);
export { getToken, onMessage };
