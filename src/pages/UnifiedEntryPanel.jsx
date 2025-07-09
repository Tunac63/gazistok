// src/components/UnifiedEntryPanel.jsx (Realtime Database uyumlu)

import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import { ref, get, push } from "firebase/database";
import { Card, Row, Col, Form, Button, Alert, Accordion } from "react-bootstrap";

const UnifiedEntryPanel = () => {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [savedIds, setSavedIds] = useState([]);
  const [message, setMessage] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await get(ref(db, "products"));
        const data = snapshot.val() || {};
        const productList = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setProducts(productList);
      } catch (err) {
        console.error("Ürün verileri alınamadı:", err);
        setMessage({ type: "danger", text: "Ürünler yüklenirken hata oluştu." });
      }
    };

    fetchProducts();
  }, []);

  const handleQuantityChange = (id, value) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const handleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(id);
      const keys = Object.keys(inputRefs.current);
      const currentIndex = keys.indexOf(id);
      const nextId = keys[currentIndex + 1];
      if (nextId && inputRefs.current[nextId]) {
        inputRefs.current[nextId].focus();
      }
    }
  };

  const handleSave = async (id) => {
    const quantity = Number(quantities[id]);
    const product = products.find((p) => p.id === id);
    if (!product || !quantity || quantity <= 0) return;

    const total = parseFloat(product.unitPrice) * quantity;
    const today = new Date().toISOString();

    try {
      await push(ref(db, "entries"), {
        productId: id,
        quantity,
        totalCost: total,
        date: today,
      });

      setSavedIds((prev) => [...prev, id]);
      setMessage({
        type: "success",
        text: `${product.name} → ${quantity} adet kaydedildi (₺${total.toFixed(2)})`,
      });
      setQuantities((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setMessage({ type: "danger", text: "Kayıt sırasında hata oluştu." });
    }
  };

  const categories = Array.from(
    new Set(products.map((p) => p.category?.trim() || "Diğer"))
  ).sort();

  return (
    <div className="container mt-4">
      <h4>🧾 Birleşik Ürün Giriş Paneli</h4>
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Accordion defaultActiveKey={categories[0]}>
        {categories.map((category) => {
          const kategoriUrunleri = products.filter(
            (p) => (p.category?.trim() || "Diğer") === category
          );
          return (
            <Accordion.Item key={category} eventKey={category}>
              <Accordion.Header>📁 {category}</Accordion.Header>
              <Accordion.Body>
                <Row xs={1} md={2} lg={3} className="g-4">
                  {kategoriUrunleri.map((product) => {
                    const quantity = quantities[product.id] || "";
                    const total = parseFloat(product.unitPrice) * Number(quantity || 0);
                    const isSaved = savedIds.includes(product.id);

                    return (
                      <Col key={product.id}>
                        <Card className={isSaved ? "border-success" : ""}>
                          <Card.Body>
                            <Card.Title>{product.name}</Card.Title>
                            <Card.Subtitle className="mb-2 text-muted">
                              ₺{parseFloat(product.unitPrice).toFixed(2)}
                            </Card.Subtitle>

                            <Form.Group className="mb-2">
                              <Form.Control
                                type="number"
                                min="1"
                                placeholder="Miktar"
                                value={quantity}
                                onChange={(e) =>
                                  handleQuantityChange(product.id, e.target.value)
                                }
                                onKeyDown={(e) => handleKeyDown(e, product.id)}
                                disabled={isSaved}
                                ref={(el) => (inputRefs.current[product.id] = el)}
                              />
                            </Form.Group>

                            <div className="mb-2">
                              Toplam: ₺{total.toFixed(2)}
                            </div>

                            <Button
                              variant={isSaved ? "outline-success" : "primary"}
                              onClick={() => handleSave(product.id)}
                              disabled={isSaved || !quantity}
                            >
                              {isSaved ? "✔ Kaydedildi" : "💾 Kaydet"}
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
};

export default UnifiedEntryPanel;
