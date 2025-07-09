// src/pages/Report.jsx (Ürün isimleriyle güncellenmiş)

import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, onValue, get } from "firebase/database";
import { Container, Table, Spinner } from "react-bootstrap";

const Report = () => {
  const [entries, setEntries] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ürün adı haritasını yükle
    const loadProducts = async () => {
      try {
        const prodSnap = await get(ref(db, "products"));
        if (prodSnap.exists()) {
          const data = prodSnap.val();
          const map = {};
          Object.entries(data).forEach(([id, p]) => {
            map[id] = p.name;
          });
          setProductMap(map);
        }
      } catch (err) {
        console.error("Ürünler yüklenirken hata:", err);
      }
    };

    // Girişleri dinle
    const entriesRef = ref(db, "entries");
    const unsubscribe = onValue(entriesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.values(data).map((item) => ({
        ...item,
        totalCost: item.totalCost || 0
      }));
      setEntries(list);
      setLoading(false);
    });

    loadProducts();
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  const totalCost = entries.reduce((sum, e) => sum + (e.totalCost || 0), 0);

  return (
    <Container style={{ marginTop: "2rem" }}>
      <h4>Üretim Raporu</h4>
      <p><strong>Toplam Üretim Maliyeti:</strong> ₺{totalCost.toFixed(2)}</p>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Miktar</th>
            <th>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((item, idx) => (
            <tr key={idx}>
              <td>{productMap[item.productId] || item.productId}</td>
              <td>{item.quantity}</td>
              <td>₺{item.totalCost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
};

export default Report;
