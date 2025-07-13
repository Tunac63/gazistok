// Bu script, gazi@tuna.com kullanıcısını admin yapar.
// src/utils/makeGaziAdmin.js
import { db } from "../firebase/config";
import { ref, get, update } from "firebase/database";

async function makeGaziAdmin() {
  const usersSnap = await get(ref(db, "users"));
  if (!usersSnap.exists()) {
    console.error("Hiç kullanıcı yok!");
    return;
  }
  const users = usersSnap.val();
  let found = false;
  for (const [id, user] of Object.entries(users)) {
    if (user.email === "gazi@tuna.com") {
      await update(ref(db, `users/${id}`), { role: "admin" });
      console.log("gazi@tuna.com admin yapıldı.");
      found = true;
      break;
    }
  }
  if (!found) {
    console.error("gazi@tuna.com bulunamadı!");
  }
}

makeGaziAdmin();
