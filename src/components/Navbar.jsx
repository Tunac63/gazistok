import React, { useState, useEffect } from "react";
import {
  Navbar as BSNavbar,
  Container,
  Nav,
  NavDropdown,
  Button,
  Offcanvas,
  Dropdown,
} from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

const navItems = [
  { label: "Anasayfa", path: "/", icon: "🏠" },
  { label: "Kasa", path: "/cash-entry", icon: "💵" },
  { label: "İmalat Girişi", path: "/unified-entry", icon: "🏭" },
  { label: "Günlük İrsaliye", path: "/daily-invoice", icon: "🗒️" },
  { label: "Rapor", path: "/report", icon: "📄" },
  { label: "Admin", path: "/admin", icon: "🛡️" },
  {
    label: "Ürünler",
    icon: "📦",
    children: [
      { label: "Ürün Ekle", path: "/products/add", icon: "➕" },
      { label: "Toplu Yükle", path: "/bulk-upload", icon: "📦" },
      { label: "Tüm Ürünler", path: "/products", icon: "📁" },
    ],
  },
  {
    label: "Hızlı Giriş",
    icon: "⚡",
    children: [
      { label: "Yeni Giriş", path: "/quick-entry", icon: "➕" },
      { label: "Seri Giriş", path: "/quick-entry/batch", icon: "🔄" },
    ],
  },
];

const Navbar = () => {
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 0) {
        setShowNavbar(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navLinkStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "0 12px",
    fontWeight: 600,
    fontSize: 15,
    color: active ? "#23263a" : "#3a3f5a",
    backgroundColor: active ? "#f3f6fd" : "transparent",
    borderRadius: 6,
    height: 36,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.2s",
    fontFamily: "Montserrat, Inter, Segoe UI, Arial, sans-serif",
  });

  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <>
      <BSNavbar
        bg="light"
        expand="md"
        fixed="top"
        style={{
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e0e6f6",
          fontFamily: "Montserrat, sans-serif",
          zIndex: 1040,
          transition: "transform 0.3s ease",
          transform: showNavbar ? "translateY(0)" : "translateY(-100%)",
        }}
      >
        <Container fluid style={{ maxWidth: 1400, paddingLeft: 0, paddingRight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
            <BSNavbar.Brand
              onClick={() => navigate("/")}
              style={{
                fontWeight: 700,
                fontSize: 20,
                cursor: "pointer",
                color: "#23263a",
                paddingLeft: 16,
              }}
            >
              Gazistok
            </BSNavbar.Brand>

            <div className="d-md-none">
              <BSNavbar.Toggle
                aria-controls="offcanvasNavbar"
                onClick={() => setShowOffcanvas(true)}
                style={{ marginRight: 16 }}
              />
            </div>

            <BSNavbar.Collapse className="d-none d-md-flex" style={{ justifyContent: "flex-end" }}>
              <Nav className="align-items-center" style={{ gap: 2 }}>
                {navItems.map((item) =>
                  item.children ? (
                    <NavDropdown
                      key={item.label}
                      title={
                        <>
                          <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                        </>
                      }
                      id={`nav-dropdown-${item.label}`}
                    >
                      {item.children.map((child) => (
                        <NavDropdown.Item
                          key={child.path}
                          onClick={() => navigate(child.path)}
                          active={location.pathname === child.path}
                        >
                          {child.icon} {child.label}
                        </NavDropdown.Item>
                      ))}
                    </NavDropdown>
                  ) : (
                    <Nav.Link
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      style={navLinkStyle(location.pathname === item.path)}
                    >
                      <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                    </Nav.Link>
                  )
                )}
                <Dropdown align="end" style={{ marginLeft: 16 }}>
                  <Dropdown.Toggle
                    variant="light"
                    id="profile-dropdown"
                    style={{
                      borderRadius: "50%",
                      padding: 0,
                      width: 40,
                      height: 40,
                      overflow: "hidden",
                      border: "1px solid #e0e6f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profil"
                        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: 18, color: "#23263a" }}>
                        {user?.displayName?.[0] || user?.email?.[0] || "P"}
                      </span>
                    )}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Header>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#23263a" }}>
                        {user?.displayName || user?.email || "Profil"}
                      </div>
                    </Dropdown.Header>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => navigate("/profile")}>Profilim</Dropdown.Item>
                    <Dropdown.Item onClick={handleLogout}>Çıkış Yap</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </BSNavbar.Collapse>
          </div>
        </Container>
      </BSNavbar>

      <Offcanvas
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        placement="end"
        style={{
          maxWidth: 300,
          backdropFilter: "blur(16px)",
          background: "rgba(255,255,255,0.85)",
        }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Gazistok</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} style={{ marginBottom: 8 }}>
                  <Button
                    variant="light"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 15,
                      border: "1px solid #e0e6f6",
                      borderRadius: 6,
                    }}
                    onClick={(e) => {
                      e.currentTarget.nextSibling.style.display =
                        e.currentTarget.nextSibling.style.display === "block" ? "none" : "block";
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                  </Button>
                  <div style={{ display: "none", marginLeft: 16, marginTop: 4 }}>
                    {item.children.map((child) => (
                      <Button
                        key={child.path}
                        variant="link"
                        style={{
                          width: "100%",
                          textAlign: "left",
                          color: location.pathname === child.path ? "#23263a" : "#3a3f5a",
                          fontWeight: location.pathname === child.path ? 700 : 500,
                          fontSize: 15,
                          padding: "4px 0",
                        }}
                        onClick={() => {
                          navigate(child.path);
                          setShowOffcanvas(false);
                        }}
                      >
                        {child.icon} {child.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <Nav.Link
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setShowOffcanvas(false);
                  }}
                  style={navLinkStyle(location.pathname === item.path)}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                </Nav.Link>
              )
            )}
            <Button
              onClick={() => {
                handleLogout();
                setShowOffcanvas(false);
              }}
              variant="outline-secondary"
              className="mt-3"
            >
              🚪 Çıkış Yap
            </Button>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
      <div style={{ height: 56 }} />
    </>
  );
};

export default Navbar;
