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
      <div style={{ padding: "2rem", textAlign: "center", color: '#555', fontSize: 18, fontWeight: 500, letterSpacing: 0.2 }}>
        <span style={{fontSize:28, marginBottom:8, display:'inline-block'}}>�</span><br/>
        Admin yetkisi kontrol ediliyor...
      </div>
    );
  }

  if (role !== "admin") {
    // Sadece sade bir uyarı göster, yönlendirme veya kırmızı kutu yok
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: 18 }}>
        <span style={{fontSize:24}}>🚫</span><br/>
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
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
      <div style={{ padding: "2rem", textAlign: "center", color: '#555', fontSize: 18, fontWeight: 500, letterSpacing: 0.2 }}>
        <span style={{fontSize:28, marginBottom:8, display:'inline-block'}}>🔄</span><br/>
        Yükleniyor...
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: 18 }}>
        <span style={{fontSize:24}}>🚫</span><br/>
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
  }

  return children;
};
