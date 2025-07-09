// src/components/ProductList.jsx (Realtime Database uyumlu)

import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, get, remove } from "firebase/database";
import { Table, Button, Alert } from "react-bootstrap";

const ProductList = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState(null);

  const fetchProducts = async () => {
    try {
      const snapshot = await get(ref(db, "products"));
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const list = Object.entries(rawData).map(([id, data]) => ({
          id,
          ...data,
        }));
        setProducts(list);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Veri alma hatası:", error);
      setMessage({ type: "danger", text: "Ürünler yüklenemedi." });
    }
  };

  const handleDelete = async (id) => {
    if (role !== "admin") {
      setMessage({ type: "warning", text: "🚫 Bu işlemi gerçekleştirmek için admin yetkisi gerekli." });
      return;
    }

    try {
      await remove(ref(db, `products/${id}`));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: "success", text: "Ürün silindi." });
    } catch (error) {
      console.error("Silme hatası:", error);
      setMessage({ type: "danger", text: "Silme sırasında hata oluştu." });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="mt-4">
      <h4>📋 Ürün Listesi</h4>
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ürün</th>
            <th>Birim Fiyat</th>
            <th>Kategori</th>
            <th>Sil</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>₺{product.unitPrice}</td>
              <td>{product.category}</td>
              <td>
                <Button
                  variant={role === "admin" ? "outline-danger" : "outline-secondary"}
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                  disabled={role !== "admin"}
                >
                  {role === "admin" ? "🗑 Sil" : "🚫 Yetki yok"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ProductList;
