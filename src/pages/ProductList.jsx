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

  const handleDelete = async (id, name) => {
    if (role !== "admin") {
      setMessage({ type: "warning", text: "🚫 Bu işlemi gerçekleştirmek için admin yetkisi gerekli." });
      return;
    }

    const confirmDelete = window.confirm(`“${name}” adlı ürünü silmek istiyor musunuz?`);
    if (!confirmDelete) return;

    try {
      await remove(ref(db, `products/${id}`));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: "success", text: `“${name}” ürünü silindi.` });
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
      {/* Header with Back Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '15px 20px',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ color: '#2d3748', margin: 0 }}>📋 Ürün Listesi</h4>
        <button
          onClick={() => window.history.back()}
          style={{
            background: 'transparent',
            border: '2px solid #5a6c7d',
            borderRadius: '8px',
            color: '#5a6c7d',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ← Ana Menü
        </button>
      </div>

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
              <td>₺{parseFloat(product.unitPrice).toFixed(2)}</td>
              <td>{product.category}</td>
              <td>
                <Button
                  variant={role === "admin" ? "outline-danger" : "outline-secondary"}
                  size="sm"
                  onClick={() => handleDelete(product.id, product.name)}
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
