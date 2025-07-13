// src/components/WelcomeMessage.jsx

import React from "react";
import { Row, Col } from "react-bootstrap";


const WelcomeMessage = ({ username = "Kullanıcı" }) => {
  // Show domain after @ and before . in uppercase if email, else username in uppercase
  let displayName = username ? username.trim() : "";
  if (displayName.includes("@")) {
    const afterAt = displayName.split("@")[1] || "";
    displayName = afterAt.split(".")[0] || "";
  }
  displayName = displayName.toUpperCase();
  return (
    <Row className="mb-3">
      <Col>
        <h5 className="text-success">Merhaba {displayName} 👋</h5>
        <p className="text-muted">Bugünkü sistem hareketlerine birlikte göz atalım!</p>
      </Col>
    </Row>
  );
};

export default WelcomeMessage;