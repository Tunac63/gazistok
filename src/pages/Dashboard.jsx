// src/components/Dashboard.jsx (Realtime Database uyumlu)

import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, get } from "firebase/database";
import { Card, Row, Col, Spinner } from "react-bootstrap";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ArcElement,
  Legend,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, ArcElement, Legend);

const Dashboard = () => {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const entrySnap = await get(ref(db, "entries"));
        const productSnap = await get(ref(db, "products"));

        const entriesData = entrySnap.exists()
          ? Object.values(entrySnap.val()).map((item) => ({
              ...item,
              date: new Date(item.date),
            }))
          : [];

        const productsData = productSnap.exists()
          ? Object.values(productSnap.val())
          : [];

        setEntries(entriesData);
        setProducts(productsData);
      } catch (error) {
        console.error("Veriler alınamadı:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const today = new Date().toDateString();

  const todayEntries = entries.filter((e) => {
    const entryDate = e.date instanceof Date ? e.date : new Date(e.date);
    return entryDate.toDateString() === today;
  });

  const totalToday = todayEntries.reduce(
    (sum, e) => sum + (parseFloat(e.totalCost) || 0),
    0
  );

  const toplamUrun = products.length;

  const ortalamaFiyat =
    products.length > 0
      ? products.reduce((sum, p) => sum + (parseFloat(p.unitPrice) || 0), 0) /
        products.length
      : 0;

  const entryDays = {};
  entries.forEach((e) => {
    const d =
      e.date instanceof Date ? e.date.toDateString() : new Date(e.date).toDateString();
    entryDays[d] = (entryDays[d] || 0) + (parseFloat(e.totalCost) || 0);
  });

  const chartData = {
    labels: Object.keys(entryDays),
    datasets: [
      {
        label: "Günlük Toplam Giriş (₺)",
        data: Object.values(entryDays),
        backgroundColor: "#4e73df",
      },
    ],
  };

  const kategoriCount = {};
  products.forEach((p) => {
    const key = p.category || "Diğer";
    kategoriCount[key] = (kategoriCount[key] || 0) + 1;
  });

  const pieData = {
    labels: Object.keys(kategoriCount),
    datasets: [
      {
        data: Object.values(kategoriCount),
        backgroundColor: ["#20c997", "#ffc107", "#fd7e14", "#6f42c1", "#0d6efd"],
      },
    ],
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <div className="mt-2">Veriler Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Hoş Geldin Glow 👋</h3>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>🧾 Bugünkü Girişler</Card.Title>
              <Card.Text>
                {todayEntries.length} işlem — ₺{totalToday.toFixed(2)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>📦 Toplam Ürün Sayısı</Card.Title>
              <Card.Text>{toplamUrun} ürün</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>💰 Ortalama Birim Fiyat</Card.Title>
              <Card.Text>₺{ortalamaFiyat.toFixed(2)}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>📊 Günlük Giriş Grafiği</Card.Title>
              <Bar data={chartData} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>🧩 Ürün Kategori Dağılımı</Card.Title>
              <Pie data={pieData} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
