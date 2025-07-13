// src/components/AddProduct.jsx
import React, { useState, useEffect } from "react";
import { Container, Card, Form, Button, Alert, Spinner, InputGroup } from "react-bootstrap";
import { db } from "../firebase/config";
import { ref, get, push, serverTimestamp } from "firebase/database";

const AddProduct = () => {
  const [name, setName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [message, setMessage] = useState(null);
  const [createdDate, setCreatedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    const loadCategoriesFromProducts = async () => {
      try {
        const snap = await get(ref(db, "products"));
        const data = snap.val() || {};
        const cats = Array.from(new Set(Object.values(data).map((p) => p.category?.trim()).filter(Boolean)));
        setCategories(cats);
      } catch (err) {
        console.error("Kategori yükleme hatası:", err);
        setMessage({ type: "danger", text: "Kategoriler yüklenemedi." });
      } finally {
        setLoadingCats(false);
      }
    };

    loadCategoriesFromProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !unitPrice || isNaN(unitPrice) || !category) {
      setMessage({ type: "danger", text: "Lütfen tüm alanları geçerli şekilde doldurun." });
      return;
    }

    try {
      const timestamp = createdDate
        ? new Date(createdDate).getTime()
        : serverTimestamp();

      const newRef = await push(ref(db, "products"), {
        name: name.trim(),
        unitPrice: parseFloat(unitPrice),
        category,
        createdAt: timestamp,
      });

      if (newRef.key) {
        setMessage({ type: "success", text: "✔ Ürün başarıyla eklendi!" });
        setName("");
        setUnitPrice("");
        setCategory("");
        setCreatedDate(new Date().toISOString().split("T")[0]);
      } else {
        setMessage({ type: "danger", text: "⚠ Ürün eklenemedi. Lütfen tekrar deneyin." });
      }
    } catch (err) {
      console.error("Ürün ekleme hatası:", err);
      setMessage({ type: "danger", text: "Ürün eklenirken hata oluştu." });
    }
  };

  return (
    <Container fluid="sm">
      <Card className="mt-5 mx-auto shadow" style={{ maxWidth: "600px" }}>
        <Card.Header className="bg-primary text-white text-center rounded-top">
          <h4 className="mb-0">➕ Yeni Ürün Ekle</h4>
        </Card.Header>
        <Card.Body>
          {message && <Alert variant={message.type}>{message.text}</Alert>}

          {loadingCats ? (
            <div className="text-center py-5">
              <Spinner animation="border" /> Kategoriler yükleniyor...
            </div>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Ürün Adı</Form.Label>
                <Form.Control
                  size="lg"
                  type="text"
                  placeholder="Ör. Kırmızı Kek"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Birim Fiyat (₺)</Form.Label>
                <InputGroup size="lg">
                  <InputGroup.Text>₺</InputGroup.Text>
                  <Form.Control
                    type="number"
                    placeholder="7.50"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Kategori</Form.Label>
                <Form.Select
                  size="lg"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Kategori seçin…</option>
                  {categories.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Oluşturulma Tarihi</Form.Label>
                <Form.Control
                  size="lg"
                  type="date"
                  value={createdDate}
                  onChange={(e) => setCreatedDate(e.target.value)}
                />
              </Form.Group>

              <div className="d-grid">
                <Button size="lg" variant="primary" type="submit">
                  Ürün Ekle
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AddProduct;
