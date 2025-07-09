// src/App.jsx (Realtime Database & Auth uyumlu, korumalı rotalar)

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "./firebase/config";
import { ref, get, set } from "firebase/database";

// Sayfa bileşenleri
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import QuickEntryPanel from "./pages/QuickEntryPanel";
import UnifiedEntryPanel from "./pages/UnifiedEntryPanel";
import AdminPanel from "./pages/AdminPanel";
import Report from "./pages/Report";
import AddProduct from "./components/AddProduct";
import ProductList from "./pages/ProductList";
import ProductEditPanel from "./pages/ProductEditPanel";

// Ortak bileşen
import AppNavbar from "./components/Navbar";

// Korumalı rotalar
import { PrivateRoute, AdminRoute, RoleRoute } from "./routes/ProtectedRoutes";

function App() {
  const [user, loading] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setRoleLoading(false);
        return;
      }

      try {
        const userPath = `users/${user.uid}`;
        const snapshot = await get(ref(db, userPath));

        if (!snapshot.exists()) {
          const allUsersSnap = await get(ref(db, "users"));
          const isFirstUser = !allUsersSnap.exists();

          const newRole = isFirstUser ? "admin" : "user";
          await set(ref(db, userPath), {
            email: user.email,
            role: newRole,
          });
          setRole(newRole);
        } else {
          const data = snapshot.val();
          setRole(data.role || "user");
        }
      } catch (error) {
        console.error("Rol bilgisi alınamadı:", error);
        setRole("user");
      }

      setRoleLoading(false);
    };

    fetchRole();
  }, [user]);

  if (loading || roleLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h5>🔄 Oturum ve rol kontrolü yapılıyor...</h5>
      </div>
    );
  }

  return (
    <Router>
      {user && <AppNavbar role={role} />}
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={
                <PrivateRoute user={user}>
                  <Dashboard />
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
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;