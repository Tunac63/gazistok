// src/components/ProductTable.jsx (Realtime Database uyumlu)

import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, get } from "firebase/database";
import { Table, Alert, Spinner } from "react-bootstrap";

const ProductTable = () => {
  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snapshot = await get(ref(db, "products"));
        if (snapshot.exists()) {
          const raw = snapshot.val();
          const parsed = Object.entries(raw).map(([id, value]) => ({
            id,
            ...value
          }));
          setUrunler(parsed);
        } else {
          setUrunler([]);
        }
      } catch (err) {
        console.error("📛 Ürün çekme hatası:", err);
        setHata("Ürün listesi yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="text-center mt-4">
        <Spinner animation="border" role="status" />
        <div className="mt-2">Ürünler yükleniyor...</div>
      </div>
    );
  }

  if (hata) {
    return <Alert variant="danger" className="mt-4">{hata}</Alert>;
  }

  return (
    <Table striped bordered hover responsive className="mt-4">
      <thead>
        <tr>
          <th>Ürün Adı</th>
          <th>Birim</th>
          <th>Fiyat</th>
        </tr>
      </thead>
      <tbody>
        {urunler.map((urun) => (
          <tr key={urun.id}>
            <td>{urun.name}</td>
            <td>{urun.unit || "-"}</td>
            <td>₺{urun.unitPrice}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default ProductTable;
