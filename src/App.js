import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, messaging, getToken, onMessage } from "./firebase/config";
import { ref, get, set } from "firebase/database";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProfilSayfasi from "./pages/ProfilePage";
import QuickEntryPanel from "./pages/QuickEntryPanel";
import UnifiedEntryPanel from "./pages/UnifiedEntryPanel";
import AdminPanel from "./pages/AdminPanel";
import Report from "./pages/Report";
import AddProduct from "./components/AddProduct";
import ProductList from "./pages/ProductList";
import ProductEditPanel from "./pages/ProductEditPanel";
import BulkUpload from "./pages/BulkUpload";
import DailyInvoice from "./pages/DailyInvoice";
import CashEntry from "./pages/CashEntry"; 
import CashSummary from "./pages/CashSummary";
import AppSelector from "./pages/AppSelector";
import DailyTasks from "./pages/DailyTasks";
import SupplyStock from "./pages/SupplyStock";

// Ortak bileşen
import Navbar from "./components/Navbar";

// Korumalı rotalar
import { PrivateRoute, AdminRoute, RoleRoute } from "./routes/ProtectedRoutes";

function App() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [minDelayDone, setMinDelayDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // FCM: Bildirim izni ve token alma (her durumda tokeni al ve göster)
  useEffect(() => {
    if (user && window.Notification) {
      const getAndSaveToken = () => {
        getToken(messaging, { vapidKey: "BNsADJ7KeCBhuCuHX1gjXOB7xVSv5nWcz0SehGewCzdzVh582DWkpLhRvqb_sw2uEvUwHciRCi3040zDjn0opG4" })
          .then((currentToken) => {
            if (currentToken) {
              // FCM token'ı kullanıcıya kaydet
              set(ref(db, `users/${user.uid}/fcmToken`), currentToken);
              console.log("FCM Token kaydedildi:", currentToken);
            } else {
              alert("FCM token alınamadı! (Boş token)");
            }
          })
          .catch((err) => {
            console.log("FCM token alınamadı", err);
            alert("FCM token alınamadı! (Hata)\n" + err?.message);
          });
      };
      if (Notification.permission === "granted") {
        getAndSaveToken();
      } else {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            getAndSaveToken();
          } else {
            alert("Bildirim izni verilmediği için token alınamadı.");
          }
        });
      }
    }
  }, [user]);

  // FCM: Uygulama açıkken gelen bildirimi yakala
  useEffect(() => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      // Mobilde ve webde native notification göster
      if (window.Notification && Notification.permission === "granted") {
        new Notification(payload?.notification?.title || "Bildirim", {
          body: payload?.notification?.body || "",
          icon: "/logo192.png"
        });
      } else {
        // Bildirim izni yoksa veya desteklenmiyorsa konsola yaz
        console.log("Bildirim:", payload?.notification?.title, payload?.notification?.body);
      }
    });
  }, []);

  // ...existing code...

  useEffect(() => {
    setRoleLoading(true);
    const userRef = ref(db, `users/${user?.uid}`);
    const allUsersRef = ref(db, "users");

    if (!user) {
      setRole(null);
      setRoleLoading(false);
      return;
    }

    get(userRef)
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          return val.role || "user";
        }

        const allSnap = await get(allUsersRef);
        const allUsers = allSnap.val() || {};
        const isFirstUser = Object.keys(allUsers).length === 0;
        const newRole = isFirstUser ? "admin" : "user";

        await set(userRef, {
          email: user.email,
          role: newRole,
          createdAt: Date.now(),
        });

        return newRole;
      })
      .then((resolvedRole) => setRole(resolvedRole))
      .catch((err) => {
        console.error("Rol alınırken hata:", err);
        setRole("user");
      })
      .finally(() => setRoleLoading(false));
  }, [user]);

  console.log("DEBUG user:", user);
  console.log("DEBUG role:", role);
  console.log("DEBUG loading:", loading, "roleLoading:", roleLoading);
  if (loading || roleLoading || !minDelayDone) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0e7ef 0%, #f8fafc 100%)',
        width: '100vw',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.55)',
          borderRadius: 28,
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.12)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '2px solid rgba(255,255,255,0.18)',
          padding: '40px 6vw 32px 6vw',
          maxWidth: 420,
          width: '90vw',
          margin: 'auto',
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: 28,
            pointerEvents: 'none',
            background: 'conic-gradient(from 90deg at 50% 50%, #1976d2 0deg, #b388ff 90deg, #80d0c7 180deg, #1976d2 360deg)',
            opacity: 0.13,
            filter: 'blur(8px)'
          }} />
          <div style={{marginBottom: 28, zIndex: 2, position: 'relative', display:'flex', justifyContent:'center', alignItems:'center', width:'100%'}}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',margin:'auto',animation:'spinlux 1.2s linear infinite'}}>
              <defs>
                <linearGradient id="luxspin" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1976d2"/>
                  <stop offset="0.5" stopColor="#b388ff"/>
                  <stop offset="1" stopColor="#80d0c7"/>
                </linearGradient>
              </defs>
              <circle cx="36" cy="36" r="30" stroke="#b0b8c9" strokeWidth="8" opacity="0.18"/>
              <path d="M66 36a30 30 0 1 1-12.4-24.3" stroke="url(#luxspin)" strokeWidth="8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{fontSize:'2rem', fontWeight:800, color:'#222', letterSpacing:0.3, marginBottom:10, textShadow:'0 2px 8px #fff8', textAlign:'center', width:'100%'}}>Güvenlik ve Yetki Doğrulanıyor...</div>
          <div style={{fontSize:'1.05rem', color:'#555', marginTop:2, fontWeight:500, textAlign:'center', width:'100%'}}>Sistem erişiminiz için kimlik ve yetki doğrulaması yapılıyor.<br/>Lütfen birkaç saniye bekleyin.</div>
          <style>{`
            @keyframes spinlux { 100% { transform: rotate(360deg); } }
            @media (max-width: 600px) {
              .lux-loading-panel { padding: 24px 2vw 18px 2vw !important; max-width: 98vw !important; }
              .lux-loading-title { font-size: 1.2rem !important; }
              .lux-loading-subtitle { font-size: 0.95rem !important; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {user && <Navbar role={role} />}
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/profile"
              element={
                <PrivateRoute user={user}>
                  <ProfilSayfasi kullanici={user} />
                </PrivateRoute>
              }
            />
            <Route
              path="/"
              element={
                <PrivateRoute user={user}>
                  <AppSelector />
                </PrivateRoute>
              }
            />
            <Route
              path="/cash-summary"
              element={
                <PrivateRoute user={user}>
                  <CashSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute user={user}>
                  <Dashboard user={user} />
                </PrivateRoute>
              }
            />
            <Route
              path="/quick-entry"
              element={
                <RoleRoute user={user} role={role} allowedRoles={["admin"]}>
                  <QuickEntryPanel />
                </RoleRoute>
              }
            />
            <Route
              path="/unified-entry"
              element={
                <PrivateRoute user={user}>
                  <UnifiedEntryPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/report"
              element={
                <PrivateRoute user={user}>
                  <Report />
                </PrivateRoute>
              }
            />
            <Route
              path="/products"
              element={
                <PrivateRoute user={user}>
                  <ProductList role={role} />
                </PrivateRoute>
              }
            />
            <Route
              path="/products/add"
              element={
                <RoleRoute user={user} role={role} allowedRoles={["admin"]}>
                  <AddProduct />
                </RoleRoute>
              }
            />
            <Route
              path="/products/edit/:id"
              element={
                <PrivateRoute user={user}>
                  <ProductEditPanel />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute user={user} role={role}>
                  <AdminPanel />
                </AdminRoute>
              }
            />
            <Route
              path="/bulk-upload"
              element={
                <RoleRoute user={user} role={role} allowedRoles={["admin"]}>
                  <BulkUpload />
                </RoleRoute>
              }
            />
            <Route
              path="/daily-invoice"
              element={
                <PrivateRoute user={user}>
                  <DailyInvoice />
                </PrivateRoute>
              }
            />
            <Route
              path="/cash-entry"
              element={
                <PrivateRoute user={user}>
                  <CashEntry />
                </PrivateRoute>
              }
            />
            <Route
              path="/daily-tasks"
              element={
                <PrivateRoute user={user}>
                  <DailyTasks currentUser={user?.displayName || user?.email || "Kullanıcı"} isAdmin={role === "admin"} />
                </PrivateRoute>
              }
            />
            <Route
              path="/supply-stock"
              element={
                <PrivateRoute user={user}>
                  <SupplyStock />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;

// ---
// React Native için FCM push bildirimi örneği (web kodunuzdan bağımsızdır)
// Eğer bu dosya React Native projesinde kullanılacaksa, aşağıdaki kodu kullanabilirsiniz:
//
// import React, { useEffect } from 'react';
// import messaging from '@react-native-firebase/messaging';
// import { Alert } from 'react-native';
//
// const App = () => {
//   useEffect(() => {
//     // Bildirim izni iste
//     messaging().requestPermission().then(authStatus => {
//       if (
//         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//         authStatus === messaging.AuthorizationStatus.PROVISIONAL
//       ) {
//         // Token al
//         messaging().getToken().then(token => {
//           console.log('FCM Token:', token);
//         });
//       }
//     });
//
//     // Uygulama açıkken gelen bildirimi yakala
//     const unsubscribe = messaging().onMessage(async remoteMessage => {
//       Alert.alert(
//         remoteMessage.notification?.title || "Bildirim",
//         remoteMessage.notification?.body || ""
//       );
//     });
//
//     // Arka planda/kapalıyken gelen bildirimi yakala (kilit ekranı dahil)
//     messaging().setBackgroundMessageHandler(async remoteMessage => {
//       // Burada ekstra işlem yapabilirsiniz (genellikle otomatik sistem bildirimi çıkar)
//     });
//
//     return unsubscribe;
//   }, []);
//
//   return (
//     // ...mevcut uygulama kodunuz...
//   );
// };
//
// export default App;
