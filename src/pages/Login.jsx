// src/components/Login.jsx (Realtime uyumlu - Auth giriş)

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { Form, Button, Container, Alert } from "react-bootstrap";
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
      navigate("/"); // Giriş başarılıysa ana sayfaya yönlendir
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
          setHata("Giriş başarısız. Lütfen bilgilerinizi kontrol edin.");
      }
    }
  };

  return (
    <Container style={{ maxWidth: "400px", marginTop: "4rem" }}>
      <h3 className="mb-4">Giriş Yap</h3>
      {hata && <Alert variant="danger">{hata}</Alert>}
      <Form onSubmit={handleLogin}>
        <Form.Group className="mb-3" controlId="formEmail">
          <Form.Label>E-posta</Form.Label>
          <Form.Control
            type="email"
            placeholder="mail@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formSifre">
          <Form.Label>Şifre</Form.Label>
          <Form.Control
            type="password"
            placeholder="••••••••"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            required
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="w-100">
          Giriş Yap
        </Button>
      </Form>

      <p className="mt-3 text-center">
        Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
      </p>
    </Container>
  );
};

export default Login;
