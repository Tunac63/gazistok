// src/components/ProductEditPanel.jsx (Realtime Database uyumlu)

import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, get, update } from "firebase/database";
import { Table, Button, Form, Alert } from "react-bootstrap";

const ProductEditPanel = () => {
  const [products, setProducts] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", unitPrice: "", category: "" });
  const [message, setMessage] = useState(null);

  const fetchProducts = async () => {
    try {
      const snapshot = await get(ref(db, "products"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        }));
        setProducts(list);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Ürünler alınamadı:", err);
      setMessage({ type: "danger", text: "Veri alınırken hata oluştu." });
    }
  };

  const startEdit = (product) => {
    setEditId(product.id);
    setEditData({
      name: product.name,
      unitPrice: product.unitPrice,
      category: product.category || ""
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({ name: "", unitPrice: "", category: "" });
  };

  const handleChange = (field, value) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = async () => {
    try {
      await update(ref(db, `products/${editId}`), {
        name: editData.name.trim(),
        unitPrice: Number(editData.unitPrice),
        category: editData.category.trim()
      });

      setMessage({ type: "success", text: "✔ Ürün başarıyla güncellendi!" });
      setEditId(null);
      setEditData({ name: "", unitPrice: "", category: "" });
      fetchProducts(); // Listeyi yenile
    } catch (err) {
      console.error("Güncelleme hatası:", err);
      setMessage({ type: "danger", text: "Hata oluştu, kaydedilemedi." });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="mt-4">
      <h4>🛠 Ürün Düzenleme Paneli</h4>
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ad</th>
            <th>Birim Fiyat</th>
            <th>Kategori</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              {editId === product.id ? (
                <>
                  <td>
                    <Form.Control
                      type="text"
                      value={editData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="number"
                      value={editData.unitPrice}
                      onChange={(e) => handleChange("unitPrice", e.target.value)}
                    />
                  </td>
                  <td>
                    <Form.Control
                      type="text"
                      value={editData.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                    />
                  </td>
                  <td>
                    <Button variant="success" size="sm" onClick={saveChanges}>
                      💾 Kaydet
                    </Button>{" "}
                    <Button variant="outline-secondary" size="sm" onClick={cancelEdit}>
                      ❌ İptal
                    </Button>
                  </td>
                </>
              ) : (
                <>
                  <td>{product.name}</td>
                  <td>₺{product.unitPrice}</td>
                  <td>{product.category}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => startEdit(product)}
                    >
                      ✏️ Düzenle
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ProductEditPanel;
