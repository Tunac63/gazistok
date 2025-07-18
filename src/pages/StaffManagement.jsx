// src/pages/StaffManagement.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';

const StaffManagement = () => {
  const navigate = useNavigate();
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    const navbar = document.querySelector(".navbar");
    if (navbar) navbar.style.display = "none";
    return () => {
      if (navbar) navbar.style.display = "";
    };
  }, []);

  const options = [
    {
      icon: "⏰",
      title: "Haftalık Shift Yönetimi",
      desc: "Vardiya planlama, geliş-gidiş saatleri ve alan atamaları",
      color: "#9c27b0",
      onClick: () => navigate("/weekly-shifts"),
      bgHover: "#f3e5f5",
      shadowColor: "#9c27b070",
      features: ["📅 Haftalık planlama", "🕐 Esnek saatler", "🏢 Alan ataması"]
    },
    {
      icon: "👥",
      title: "Personel Listesi",
      desc: "Personel bilgileri, bölümler ve işe giriş detayları",
      color: "#ff5722",
      onClick: () => navigate("/staff-list"),
      bgHover: "#fbe9e7",
      shadowColor: "#ff572270",
      features: ["📝 Personel kayıtları", "🏭 Bölüm yönetimi", "📊 SGK takibi"]
    }
  ];

  const headerStyle = {
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    fontWeight: "600",
    fontSize: window.innerWidth <= 768 ? "1.8rem" : "2.2rem",
    color: "#2d3748",
    letterSpacing: "-0.3px",
    marginBottom: "15px"
  };

  const cardStyle = (item, idx) => ({
    border: "none",
    cursor: "pointer",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    minHeight: window.innerWidth <= 768 ? "280px" : "320px",
    background: hoverIndex === idx 
      ? `linear-gradient(135deg, ${item.bgHover} 0%, white 100%)`
      : "white",
    transform: hoverIndex === idx ? "translateY(-8px) scale(1.02)" : "none",
    boxShadow: hoverIndex === idx
      ? `0 20px 40px ${item.shadowColor}, 0 0 0 1px ${item.color}20`
      : "0 8px 25px rgba(0, 0, 0, 0.08)",
    borderRadius: "20px",
    overflow: "hidden"
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: window.innerWidth <= 768 ? "15px" : "30px",
      position: "relative"
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "100px",
        height: "100px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "50%",
        animation: "float 6s ease-in-out infinite"
      }}></div>
      <div style={{
        position: "absolute",
        top: "60%",
        right: "8%",
        width: "60px",
        height: "60px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "50%",
        animation: "float 8s ease-in-out infinite reverse"
      }}></div>

      <Container fluid style={{ 
        maxWidth: window.innerWidth <= 768 ? "95%" : "1000px", 
        position: "relative", 
        zIndex: 1,
        padding: window.innerWidth <= 768 ? "0 10px" : "0"
      }}>
        {/* Back Button */}
        <div style={{ marginBottom: window.innerWidth <= 768 ? "20px" : "30px" }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: "rgba(71, 85, 105, 0.1)",
              border: "2px solid rgba(71, 85, 105, 0.2)",
              borderRadius: window.innerWidth <= 768 ? "8px" : "12px",
              color: "#334155",
              padding: window.innerWidth <= 768 ? "8px 16px" : "12px 20px",
              fontSize: window.innerWidth <= 768 ? "12px" : "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: window.innerWidth <= 768 ? "6px" : "8px",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(71, 85, 105, 0.15)";
              e.target.style.transform = "translateX(-3px)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(71, 85, 105, 0.1)";
              e.target.style.transform = "translateX(0)";
            }}
          >
            <span style={{ fontSize: "16px" }}>←</span> Ana Menüye Dön
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: window.innerWidth <= 768 ? "25px" : "40px" }}>
          <h1 style={{
            ...headerStyle,
            color: "#1e293b",
            textShadow: "0 2px 20px rgba(0,0,0,0.1)",
            marginBottom: "10px"
          }}>
            ⏰ Personel Shift & Listesi
          </h1>
          <p style={{ 
            color: "rgba(30, 41, 59, 0.7)", 
            fontSize: window.innerWidth <= 768 ? "14px" : "16px",
            maxWidth: window.innerWidth <= 768 ? "90%" : "600px",
            margin: "0 auto",
            lineHeight: "1.5",
            padding: window.innerWidth <= 768 ? "0 10px" : "0"
          }}>
            Haftalık vardiya planlaması ve personel bilgilerini yönetin
          </p>
        </div>

        {/* Options Cards */}
        <Row className="justify-content-center g-4">
          {options.map((item, idx) => (
            <Col xs={12} md={6} key={idx}>
              <Card
                onClick={item.onClick}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                style={cardStyle(item, idx)}
              >
                <Card.Body style={{ 
                  padding: window.innerWidth <= 768 ? "25px" : "35px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  {/* Icon and Title */}
                  <div style={{ textAlign: "center", marginBottom: window.innerWidth <= 768 ? "15px" : "20px" }}>
                    <div style={{
                      fontSize: window.innerWidth <= 768 ? "3rem" : "3.5rem",
                      marginBottom: window.innerWidth <= 768 ? "12px" : "15px",
                      transition: "all 0.3s ease",
                      transform: hoverIndex === idx ? "scale(1.1)" : "scale(1)",
                      filter: hoverIndex === idx ? "drop-shadow(0 5px 15px rgba(0,0,0,0.2))" : "none"
                    }}>
                      {item.icon}
                    </div>
                    <h3 style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: "700",
                      color: hoverIndex === idx ? item.color : "#2d3748",
                      fontSize: window.innerWidth <= 768 ? "1.3rem" : "1.5rem",
                      marginBottom: window.innerWidth <= 768 ? "8px" : "10px",
                      transition: "color 0.3s ease"
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      color: "#64748b",
                      fontSize: window.innerWidth <= 768 ? "12px" : "14px",
                      lineHeight: "1.4",
                      margin: "0"
                    }}>
                      {item.desc}
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <div style={{
                      background: hoverIndex === idx ? item.bgHover : "#f8fafc",
                      borderRadius: window.innerWidth <= 768 ? "8px" : "12px",
                      padding: window.innerWidth <= 768 ? "12px" : "15px",
                      transition: "all 0.3s ease"
                    }}>
                      <h6 style={{
                        color: item.color,
                        fontSize: window.innerWidth <= 768 ? "10px" : "12px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "8px"
                      }}>
                        Özellikler
                      </h6>
                      {item.features.map((feature, i) => (
                        <div key={i} style={{
                          fontSize: window.innerWidth <= 768 ? "11px" : "13px",
                          color: "#4a5568",
                          marginBottom: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div style={{ 
                      textAlign: "center", 
                      marginTop: window.innerWidth <= 768 ? "12px" : "15px",
                      opacity: hoverIndex === idx ? 1 : 0.7,
                      transition: "opacity 0.3s ease"
                    }}>
                      <span style={{
                        background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`,
                        color: "white",
                        padding: window.innerWidth <= 768 ? "6px 16px" : "8px 20px",
                        borderRadius: window.innerWidth <= 768 ? "16px" : "20px",
                        fontSize: window.innerWidth <= 768 ? "10px" : "12px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        boxShadow: `0 4px 15px ${item.shadowColor}`
                      }}>
                        Başlat →
                      </span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Info Footer */}
        <div style={{
          textAlign: "center",
          marginTop: "40px",
          color: "rgba(30, 41, 59, 0.6)",
          fontSize: "13px"
        }}>
          <p style={{ margin: 0 }}>
            📱 Mobil uyumlu tasarım • 📊 Excel & WhatsApp raporlama • 🔒 Admin yetkileri
          </p>
        </div>
      </Container>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
};

export default StaffManagement;
