// src/components/Login.jsx (iyileştirilmiş)

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  Form,
  Button,
  Container,
  Alert,
  Card,
} from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, sifre);
      setHata("");
      navigate("/"); // Giriş başarılıysa yönlendir
    } catch (err) {
      console.error("Giriş hatası:", err);
      switch (err.code) {
        case "auth/user-not-found":
          setHata("Kullanıcı bulunamadı. Lütfen kayıt olun.");
          break;
        case "auth/wrong-password":
          setHata("Yanlış şifre. Lütfen tekrar deneyin.");
          break;
        case "auth/invalid-email":
          setHata("Geçersiz e-posta formatı.");
          break;
        default:
          setHata("Giriş başarısız. Bilgilerinizi kontrol edin.");
      }
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
      <Card className="p-4 shadow-lg rounded-4" style={{ width: "100%", maxWidth: "420px" }}>
        <h3 className="mb-4 text-center fw-bold text-primary">✨ Glow Gazi Giriş</h3>

        {hata && <Alert variant="danger">{hata}</Alert>}

        <Form onSubmit={handleLogin}>
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
            <Form.Label className="fw-semibold">🔒 Şifre</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              required
              className="rounded-3"
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="w-100 rounded-3 fw-bold">
            Giriş Yap
          </Button>
        </Form>

        <p className="mt-4 text-center text-muted">
          Hesabınız yok mu?{" "}
          <Link to="/register" className="fw-semibold text-decoration-none">
            Kayıt olun
          </Link>
        </p>
      </Card>
    </Container>
  );
};

export default Login;
