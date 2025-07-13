// src/components/StatBox.jsx

import React from "react";
import { Card } from "react-bootstrap";
import { IconContext } from "react-icons";
import { FaBoxOpen, FaUserFriends, FaChartLine, FaExclamationTriangle } from "react-icons/fa";

const iconMap = {
  products: <FaBoxOpen />,
  users: <FaUserFriends />,
  today: <FaChartLine />,
  lowStock: <FaExclamationTriangle />,
};

const colorMap = {
  products: "linear-gradient(135deg, #0dcaf0, #6dd5ed)",
  users: "linear-gradient(135deg, #ffc107, #ffce6b)",
  today: "linear-gradient(135deg, #198754, #6fcf97)",
  lowStock: "linear-gradient(135deg, #dc3545, #ff6b6b)",
};

const StatBox = ({ type, value, label }) => (
  <Card className="text-white shadow-sm border-0 mb-3" style={{
    background: colorMap[type],
    borderRadius: "1rem"
  }}>
    <Card.Body className="d-flex justify-content-between align-items-center">
      <div>
        <h6 className="text-light">{label}</h6>
        <h4 className="fw-bold">{value}</h4>
      </div>
      <IconContext.Provider value={{ size: "2em" }}>
        {iconMap[type]}
      </IconContext.Provider>
    </Card.Body>
  </Card>
);

export default StatBox;