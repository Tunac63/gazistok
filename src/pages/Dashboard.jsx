import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { ref, get } from "firebase/database";
import {
  Container,
  Row,
  Col,
  ListGroup,
  Spinner,
  Card,
} from "react-bootstrap";

import WelcomeMessage from "../components/WelcomeMessage";
import StatBox from "../components/StatBox";
import AdvancedSearchPanel from "../components/AdvancedSearchPanel";
import ProductCard from "../components/ProductCard";
import NotificationBanner from "../components/NotificationBanner";

const Dashboard = () => {
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceSnap, productSnap, userSnap] = await Promise.all([
          get(ref(db, "dailyInvoices")),
          get(ref(db, "products")),
          get(ref(db, "users")),
        ]);

        const approvedEntries = [];
        if (invoiceSnap.exists()) {
          Object.entries(invoiceSnap.val()).forEach(([_, dayEntries]) => {
            Object.values(dayEntries).forEach((entry) => {
              if (entry.approved) {
                approvedEntries.push({
                  ...entry,
                  date: new Date(entry.date),
                  totalCost: parseFloat(entry.totalCost || 0),
                  items: entry.items || [],
                });
              }
            });
          });
        }

        const productData = productSnap.exists()
          ? Object.entries(productSnap.val()).map(([id, val]) => ({ id, ...val }))
          : [];

        const userData = userSnap.exists()
          ? Object.entries(userSnap.val()).map(([id, val]) => ({ id, ...val }))
          : [];

        setEntries(approvedEntries);
        setProducts(productData);
        setUsers(userData);
      } catch (error) {
        console.error("Dashboard veri çekme hatası:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const today = new Date().toDateString();
  const todayEntries = entries.filter((e) => e.date.toDateString() === today);
  const totalToday = todayEntries.reduce((sum, e) => sum + e.totalCost, 0);

  const notifications = [];
  if (todayEntries.length === 0) {
    notifications.push({
      title: "📭 Günlük Giriş Yok",
      message: "Bugün henüz onaylanmış işlem yapılmamış.",
      variant: "secondary",
    });
  }

  const categories = [...new Set(products.map(p => p.category || "Diğer"))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "" || (p.category || "Diğer") === selectedCategory;
    const unit = parseFloat(p.unitPrice);
    const matchesPrice =
      (!minPrice || unit >= parseFloat(minPrice)) &&
      (!maxPrice || unit <= parseFloat(maxPrice));
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const productActivity = {};
  entries.forEach((e) => {
    e.items?.forEach((item) => {
      const key = item.name;
      productActivity[key] = (productActivity[key] || 0) + 1;
    });
  });

  const leastPurchased = Object.entries(productActivity)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const topRated = products
    .filter((p) => p.rating)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setMinPrice("");
    setMaxPrice("");
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="success" />
        <p className="mt-2">Veriler yükleniyor...</p>
      </div>
    );
  }

  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    border: "none",
    padding: "1rem",
    fontFamily: "'Inter', sans-serif",
    color: "#4a3f2d",
  };

  return (
    <Container fluid className="py-4 px-md-4">
      <WelcomeMessage username="Glow" />
      <NotificationBanner notifications={notifications} />

      <Row xs={1} sm={2} md={4} className="g-4 mb-4">
        <Col><StatBox type="today" value={`₺${totalToday.toFixed(2)}`} label="Bugünkü Giriş" /></Col>
        <Col><StatBox type="products" value={products.length} label="Ürün Sayısı" /></Col>
        <Col><StatBox type="users" value={users.length} label="Kayıtlı Kullanıcılar" /></Col>
        <Col><StatBox type="lowStock" value={leastPurchased.length} label="En Az Alınanlar" /></Col>
      </Row>

      <Row className="mb-4 g-4 flex-nowrap overflow-auto">
        <Col md={6} style={{ minWidth: 300 }}>
          <Card style={cardStyle}>
            <h5 className="mb-3" style={{ color: "#b79b68" }}>🧊 En Az Alınan Ürünler</h5>
            <ListGroup>
              {leastPurchased.map(([name, count], idx) => (
                <ListGroup.Item key={idx} style={{ backgroundColor: "transparent", border: "none" }}>
                  {name} — <span className="text-muted">{count} işlem</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col md={6} style={{ minWidth: 300 }}>
          <Card style={cardStyle}>
            <h5 className="mb-3" style={{ color: "#b79b68" }}>🌟 En Yüksek Puanlı Ürünler</h5>
            <ListGroup>
              {topRated.map((p) => (
                <ListGroup.Item key={p.id} style={{ backgroundColor: "transparent", border: "none" }}>
                  <strong>{p.name}</strong> — ⭐ {p.rating}/5
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col>
          <AdvancedSearchPanel
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            categories={categories}
            onReset={handleResetFilters}
          />
        </Col>
      </Row>

      <Row xs={1} md={2} lg={3} className="g-4">
        {filteredProducts.slice(0, 6).map((p) => (
          <Col key={p.id}>
            <ProductCard product={p} />
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default Dashboard;
