// src/components/ProductCard.jsx

import React from "react";
import { Card, Badge } from "react-bootstrap";

const getStockStyle = (stock) => {
  const s = parseFloat(stock || 0);
  if (s < 5) return "danger";
  if (s < 20) return "warning";
  return "success";
};

const ProductCard = ({ product }) => {
  return (
    <Card className="shadow-sm border-start border-4 border-success mb-3">
      <Card.Body className="d-flex justify-content-between align-items-center">
        <div>
          <h6>{product.name}</h6>
          <Badge bg="secondary">{product.category || "Kategori Yok"}</Badge>
        </div>
        <div className="text-end">
          <div className="fw-bold text-success">₺{parseFloat(product.unitPrice).toFixed(2)}</div>
          <div className={`small text-${getStockStyle(product.stock)}`}>Stok: {product.stock || 0}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProductCard;