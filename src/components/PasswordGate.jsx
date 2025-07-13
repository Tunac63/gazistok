import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { ref, get, set } from "firebase/database";
import { useNavigate } from "react-router-dom";

const PasswordGate = ({ children }) => {
  const [inputCode, setInputCode] = useState("");
  const [valid, setValid] = useState(false);
  const [status, setStatus] = useState("checking");
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) return navigate("/login");
      const codeSnap = await get(ref(db, `accessCodes/${user.uid}`));
      if (codeSnap.exists()) {
        const stored = localStorage.getItem("entry_code");
        if (stored === codeSnap.val()) {
          setValid(true);
        }
      }
      setStatus("ready");
    };
    check();
  }, []);

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const codeSnap = await get(ref(db, `accessCodes/${user.uid}`));
    if (codeSnap.exists() && inputCode === codeSnap.val()) {
      localStorage.setItem("entry_code", inputCode);
      setValid(true);
    } else {
      alert("❌ Hatalı şifre. Lütfen tekrar deneyin.");
    }
  };

  const handleRequest = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await set(ref(db, `accessRequests/${user.uid}`), {
      requestedAt: Date.now(),
      status: "pending",
    });
    alert("🔑 Şifre talebiniz admin'e gönderildi.");
  };

  if (valid) return children;

  if (status === "checking") {
    return (
      <div className="text-center mt-5">
        <p>🔐 Şifre kontrol ediliyor...</p>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column align-items-center mt-5">
      <h5>🔒 Bu sayfa şifre korumalı</h5>
      <input
        type="text"
        className="form-control w-50 mt-3 text-center"
        placeholder="Şifre girin"
        value={inputCode}
        onChange={(e) => setInputCode(e.target.value)}
      />
      <button className="btn btn-success mt-3" onClick={handleSubmit}>
        ✅ Giriş Yap
      </button>
      <button className="btn btn-outline-secondary mt-2" onClick={handleRequest}>
        📨 Admin'den Şifre Talep Et
      </button>
    </div>
  );
};

export default PasswordGate;
