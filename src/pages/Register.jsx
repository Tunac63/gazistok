// src/components/Register.jsx (premium, modern, uyumlu)

import React, { useState, useEffect, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { ref, get, set } from "firebase/database";
import {
  Form,
  Button,
  Container,
  Alert,
  Card,
  Spinner,
} from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [mesaj, setMesaj] = useState(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();


    // Sadece gazi@ ile başlayan ve .com ile biten e-posta adreslerine izin ver
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.startsWith("gazi@")) {
      setMesaj({ text: "Kayıt için gazi@ ile başlayan bir e-posta adresi gereklidir.", type: "danger" });
      return;
    }
    if (!trimmedEmail.endsWith(".com")) {
      setMesaj({ text: "Kayıt için e-posta adresi .com ile bitmelidir.", type: "danger" });
      return;
    }

    if (sifre !== sifreTekrar) {
      setMesaj({ text: "❗ Şifreler eşleşmiyor.", type: "danger" });
      return;
    }

    setLoading(true);
    setMesaj(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        sifre
      );
      const user = userCredential.user;

      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(ref(db, "users"));
      const isFirstUser = !snapshot.exists();

      await set(userRef, {
        email: user.email,
        role: isFirstUser ? "admin" : "user",
        createdAt: Date.now(),
      });

      setMesaj({
        text: "✔ Kayıt başarılı! Giriş ekranına yönlendiriliyorsunuz...",
        type: "success",
      });

      timeoutRef.current = setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      console.error("Kayıt hatası:", err.code, err.message);
      let hataMsg = "Bir hata oluştu. Lütfen tekrar deneyin.";

      if (err.code === "auth/email-already-in-use") {
        hataMsg = "🚫 Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.";
      } else if (err.code === "auth/invalid-email") {
        hataMsg = "📧 Geçersiz e-posta adresi.";
      } else if (err.code === "auth/weak-password") {
        hataMsg = "🔐 Şifre en az 6 karakter olmalıdır.";
      } else if (err.message.includes("Permission denied")) {
        hataMsg =
          "⚠ Firebase Realtime Database erişimi reddedildi. Kuralları kontrol edin.";
      }

      setMesaj({ text: hataMsg, type: "danger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card className="p-4 shadow-lg rounded-4" style={{ width: "100%", maxWidth: "420px" }}>
        <h3 className="mb-4 text-center fw-bold text-success">📝 Kayıt Ol</h3>

        {mesaj && <Alert variant={mesaj.type}>{mesaj.text}</Alert>}

        <Form onSubmit={handleRegister} noValidate>
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Label className="fw-semibold">📧 E-posta</Form.Label>
            <Form.Control
              type="email"
              placeholder="mail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-3"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formSifre">
            <Form.Label className="fw-semibold">🔐 Şifre</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              minLength={6}
              required
              className="rounded-3"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formSifreTekrar">
            <Form.Label className="fw-semibold">🔁 Şifre Tekrar</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={sifreTekrar}
              onChange={(e) => setSifreTekrar(e.target.value)}
              minLength={6}
              required
              className="rounded-3"
            />
          </Form.Group>

          <Button
            variant="success"
            type="submit"
            className="w-100 rounded-3 fw-bold"
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : "Kayıt Ol"}
          </Button>
        </Form>

        <p className="mt-4 text-center text-muted">
          Zaten hesabınız var mı?{" "}
          <Link to="/login" className="fw-semibold text-decoration-none">
            Giriş yapın
          </Link>
        </p>
      </Card>
    </Container>
  );
};

export default Register;
