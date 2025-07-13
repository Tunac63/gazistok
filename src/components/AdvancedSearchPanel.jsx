// src/components/AdvancedSearchPanel.jsx

import React from "react";
import { Form, Row, Col, InputGroup, Button } from "react-bootstrap";

const AdvancedSearchPanel = ({
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  categories,
  onReset,
}) => {
  return (
    <Form className="mb-4">
      <Row className="g-2">
        <Col xs={12} md={4}>
          <Form.Control
            type="text"
            placeholder="🔍 Ürün adını yazın..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Col>

        <Col xs={12} md={4}>
          <Form.Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">📁 Tüm Kategoriler</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </Form.Select>
        </Col>

        <Col xs={12} md={4}>
          <InputGroup>
            <Form.Control
              type="number"
              placeholder="Min ₺"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Form.Control
              type="number"
              placeholder="Max ₺"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <Button variant="outline-secondary" onClick={onReset}>Temizle</Button>
          </InputGroup>
        </Col>
      </Row>
    </Form>
  );
};

export default AdvancedSearchPanel;