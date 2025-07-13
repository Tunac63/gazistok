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

// Ortak bileşen
import Navbar from "./components/Navbar";

// Korumalı rotalar
import { PrivateRoute, AdminRoute, RoleRoute } from "./routes/ProtectedRoutes";

function App() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

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

  if (loading || roleLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h5>🔄 Oturum ve Yetki kontrol ediliyor...</h5>
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
