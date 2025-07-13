// src/components/StatsCards.jsx

import React from "react";
import { Card, Col, Row } from "react-bootstrap";

const StatsCards = ({ totalToday, productsLength, usersLength, lowStockLength }) => {
  const stats = [
    { title: "🧾 Bugünkü Giriş", value: `₺${totalToday.toFixed(2)}`, color: "success" },
    { title: "📋 Ürün Sayısı", value: productsLength, color: "primary" },
    { title: "👤 Kullanıcılar", value: usersLength, color: "info" },
    { title: "⚠ Düşük Stok", value: lowStockLength, color: "danger" },
  ];

  return (
    <Row className="g-4 mb-4">
      {stats.map((card, idx) => (
        <Col xs={6} sm={6} md={3} key={idx}>
          <Card className={`border-${card.color} shadow-sm text-center`}>
            <Card.Body>
              <h6>{card.title}</h6>
              <h5 className={`text-${card.color}`}>{card.value}</h5>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatsCards;