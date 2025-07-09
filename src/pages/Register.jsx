// src/components/Register.jsx (Realtime Database uyumlu)

import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { ref, set, get, child } from "firebase/database";
import { Form, Button, Container, Alert } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [mesaj, setMesaj] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (sifre !== sifreTekrar) {
      setMesaj({ text: "Şifreler eşleşmiyor.", type: "danger" });
      return;
    }

    try {
      setLoading(true);

      // Realtime DB'den tüm kullanıcıları kontrol et
      const userRef = ref(db);
      const snapshot = await get(child(userRef, "users"));
      const isFirstUser = !snapshot.exists();

      // Firebase Authentication ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, sifre);
      const user = userCredential.user;

      // Kullanıcıyı Realtime DB'ye kaydet
      await set(ref(db, `users/${user.uid}`), {
        email: user.email,
        role: isFirstUser ? "admin" : "user"
      });

      setMesaj({
        text: "Kayıt başarılı! Giriş ekranına yönlendiriliyorsunuz...",
        type: "success"
      });

      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("Kayıt hatası:", err);
      let hataMesaji = "Bir hata oluştu. Lütfen tekrar deneyin.";

      if (err.code === "auth/email-already-in-use") {
        hataMesaji = "Bu e-posta zaten kayıtlı. Lütfen giriş yapın.";
      } else if (err.code === "auth/invalid-email") {
        hataMesaji = "Geçersiz e-posta formatı.";
      } else if (err.code === "auth/weak-password") {
        hataMesaji = "Şifre en az 6 karakter olmalı.";
      }

      setMesaj({ text: hataMesaji, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: "400px", marginTop: "4rem" }}>
      <h3 className="mb-4">Kayıt Ol</h3>

      {mesaj && <Alert variant={mesaj.type}>{mesaj.text}</Alert>}

      <Form onSubmit={handleRegister}>
        <Form.Group className="mb-3">
          <Form.Label>E-posta</Form.Label>
          <Form.Control
            type="email"
            placeholder="mail@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Şifre</Form.Label>
          <Form.Control
            type="password"
            placeholder="••••••••"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Şifre Tekrar</Form.Label>
          <Form.Control
            type="password"
            placeholder="••••••••"
            value={sifreTekrar}
            onChange={(e) => setSifreTekrar(e.target.value)}
            required
          />
        </Form.Group>

        <Button variant="success" type="submit" className="w-100" disabled={loading}>
          {loading ? "Kayıt Olunuyor..." : "Kayıt Ol"}
        </Button>
      </Form>

      <p className="mt-3 text-center">
        Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
      </p>
    </Container>
  );
};

export default Register;
