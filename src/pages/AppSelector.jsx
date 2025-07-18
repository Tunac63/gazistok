// src/pages/AppSelector.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Modal, Button } from "react-bootstrap";

const AppSelector = () => {
  const navigate = useNavigate();
  const [hoverIndex, setHoverIndex] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', desc: '' });

  useEffect(() => {
    const navbar = document.querySelector(".navbar");
    if (navbar) navbar.style.display = "none";
    return () => {
      if (navbar) navbar.style.display = "";
    };
  }, []);

  const options = [
    {
      icon: "🏭",
      title: "İmalat & Stok Takibi",
      desc: "Ürün girişi, filtreleme, analiz ve stok raporları",
      color: "#0d6efd",
      onClick: () => navigate("/dashboard"),
      bgHover: "#eaf3ff",
      shadowColor: "#0d6efd70",
    },
    {
      icon: "💰",
      title: "Kasa Defteri",
      desc: "Günlük kasa hareketleri, gelir & gider yönetimi",
      color: "#ffc107",
      onClick: () => navigate("/cash-entry"),
      bgHover: "#fff6e0",
      shadowColor: "#ffc10770",
    },
    {
      icon: "📊",
      title: "Satış Raporları & Reçete",
      desc: "Yakında burada olacak",
      color: "#6c757d",
      onClick: () => {
        setModalContent({
          title: "📊 Satış Raporları & Reçete",
          desc: "Satış Raporları ve Reçete modülü çok yakında burada olacak."
        });
        setShowModal(true);
      },
      bgHover: "#f1f3f5",
      shadowColor: "#adb5bd70",
    },
    {
      icon: "👥",
      title: "Personel Takibi",
      desc: "Günlük görevler, performans ve temizlik raporları",
      color: "#0dcaf0",
      onClick: () => navigate("/daily-tasks"),
      bgHover: "#e0f7fa",
      shadowColor: "#0dcaf070",
    },
    {
      icon: "💳",
      title: "Personel Maaş Bilgisi",
      desc: "Parmak izi ve bordroya göre maaş hesaplama",
      color: "#6610f2",
      onClick: () => {
        setModalContent({
          title: "💳 Personel Maaş Bilgisi",
          desc: "Personel maaş hesaplama ve bordro işlemleri çok yakında burada olacak.\nParmak izi ve bordroya göre maaş hesaplama."
        });
        setShowModal(true);
      },
      bgHover: "#ede7f6",
      shadowColor: "#6610f270",
    },
    {
      icon: "🚚",
      title: "Dış Tedarik & Stok Sayım",
      desc: "Tedarikçi yönetimi ve stok sayım işlemleri",
      color: "#198754",
      onClick: () => {
        // Sadece bu kart için doğrudan yönlendirme
        navigate("/supply-stock");
      },
      bgHover: "#e9f7ef",
      shadowColor: "#19875470",
    },
    {
      icon: "⏰",
      title: "Personel Shift & Listesi",
      desc: "Haftalık vardiya yönetimi ve personel bilgileri",
      color: "#e91e63",
      onClick: () => navigate("/staff-management"),
      bgHover: "#fce4ec",
      shadowColor: "#e91e6370",
    },
  ];

  const headerStyle = {
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    fontWeight: "600",
    fontSize: "2.5rem",
    color: "#222",
    letterSpacing: "-0.4px",
  };

  return (
    <Container
      fluid
      className="d-flex justify-content-center align-items-center position-relative"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to right top, #f8fafc, #ffffff)",
        overflow: "hidden",
      }}
    >
      <Row className="text-center w-100 justify-content-center px-3">
        <Col xs={12}>
          <h1 className="mb-5" style={headerStyle}>
            ✨ Glow Gazi Giriş Paneli
          </h1>
        </Col>

        {options.map((item, idx) => (
          <Col xs={12} sm={10} md={4} lg={3} className="mb-4" key={idx}>
            <Card
              onClick={item.onClick}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
              className="rounded-4"
              style={{
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                minHeight: "200px",
                background: hoverIndex === idx ? item.bgHover : "#fff",
                transform: hoverIndex === idx ? "translateY(-6px)" : "none",
                boxShadow:
                  hoverIndex === idx
                    ? `0 12px 24px ${item.shadowColor}`
                    : "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              <Card.Body className="p-4">
                <div
                  className="mb-3"
                  style={{
                    fontSize: "2.4rem",
                    transition: "color 0.3s ease",
                    color: hoverIndex === idx ? item.color : "#333",
                  }}
                >
                  {item.icon}
                </div>
                <h5
                  className="fw-bold mb-2"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {item.title}
                </h5>
                <p className="text-muted small">{item.desc}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modalContent.title || "Yakında!"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center fs-5" style={{ whiteSpace: 'pre-line' }}>
          {modalContent.desc || "Bu modül çok yakında burada olacak."}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Kapat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Sağ alt köşeye not */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 15,
          fontSize: "0.8rem",
          color: "#999",
          opacity: 0.6,
          fontStyle: "italic",
        }}
      >
        TunaAbi :)
      </div>
    </Container>
  );
};

export default AppSelector;
