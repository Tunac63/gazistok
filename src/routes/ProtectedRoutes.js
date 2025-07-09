// src/routes/RouteGuards.jsx (Firebase Auth + Realtime DB uyumlu)

import React from "react";
import { Navigate } from "react-router-dom";
import { Alert, Container } from "react-bootstrap";

// Giriş yapmış kullanıcılar için genel koruma
export const PrivateRoute = ({ user, children }) => {
  return user ? children : <Navigate to="/login" replace />;
};

// Sadece admin yetkisine sahip kullanıcılar için özel koruma
export const AdminRoute = ({ user, role, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === null || role === undefined) {
    // Rol bilgisi henüz yüklenmemişse bekle
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        🔐 Admin kontrolü yapılıyor...
      </div>
    );
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Rol bazlı erişim: sadece allowedRoles içindekiler görebilir, diğerleri uyarı alır
export const RoleRoute = ({ user, role, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === null || role === undefined) {
    return (
      <Container style={{ padding: "2rem", textAlign: "center" }}>
        Yükleniyor...
      </Container>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <Container className="p-4">
        <Alert variant="warning">🚫 Bu sayfaya erişim yetkiniz yok.</Alert>
      </Container>
    );
  }

  return children;
};
