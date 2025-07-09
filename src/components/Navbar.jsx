// src/components/AppNavbar.jsx (Realtime Database uyumlu)

import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

const AppNavbar = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  return (
    <Navbar bg="light" expand="lg" className="mb-4 shadow-sm">
      <Container>
        <Navbar.Brand
          onClick={() => navigate("/")}
          style={{ cursor: "pointer", fontWeight: "bold" }}
        >
          GaziStok
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="gazi-navbar" />
        <Navbar.Collapse id="gazi-navbar">
          <Nav className="me-auto">
            <Nav.Link onClick={() => navigate("/unified-entry")}>🧾 Ürün Girişi</Nav.Link>
            <Nav.Link onClick={() => navigate("/quick-entry")}>⚡ Hızlı Giriş</Nav.Link>
            <Nav.Link onClick={() => navigate("/products/add")}>➕ Ürün Ekle</Nav.Link>
            <Nav.Link onClick={() => navigate("/products")}>📋 Ürün Listesi</Nav.Link>
            <Nav.Link onClick={() => navigate("/report")}>📊 Rapor</Nav.Link>

            {role === "admin" && (
              <Nav.Link onClick={() => navigate("/admin")}>🔐 Admin</Nav.Link>
            )}
          </Nav>
          <Button variant="outline-danger" onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
