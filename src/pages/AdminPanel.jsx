// src/components/AdminPanel.jsx (Realtime Database & Auth uyumlu)

import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, InputGroup, Stack } from "react-bootstrap";
import { db } from "../firebase/config";
import { ref, get, update, push, set } from "firebase/database";

const AdminPanel = () => {
  const [products, setProducts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setMessage(null);
      setLoading(true);
      try {
        // Parallel veri alma
        const [prodSnap, entSnap, userSnap, catSnap] = await Promise.all([
          get(ref(db, "products")),
          get(ref(db, "entries")),
          get(ref(db, "users")),
          get(ref(db, "categories")),
        ]);

        if (prodSnap.exists()) {
          setProducts(Object.entries(prodSnap.val()).map(([id, p]) => ({ id, ...p })));
        }
        if (entSnap.exists()) {
          setEntries(Object.entries(entSnap.val()).map(([id, e]) => ({ id, ...e })));
        }
        if (userSnap.exists()) {
          const ulist = Object.entries(userSnap.val()).map(([id, u]) => ({ id, ...u }));
          setUsers(ulist);
          const roleMap = {};
          ulist.forEach((u) => { roleMap[u.id] = u.role || "user"; });
          setRoles(roleMap);
        }
        if (catSnap.exists()) {
          setCategories(Object.entries(catSnap.val()).map(([id, c]) => ({ id, name: c.name })));
        }
      } catch (err) {
        console.error("AdminPanel veri alma hatası:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Bugünkü girişler ve toplam tutar
  const todayStr = new Date().toDateString();
  const todayEntries = entries.filter(
    (e) => e.date && new Date(e.date).toDateString() === todayStr
  );
  const totalAmount = todayEntries.reduce(
    (sum, e) => sum + (parseFloat(e.totalCost) || 0),
    0
  );

  const handleRoleChange = (id, newRole) => {
    setRoles((prev) => ({ ...prev, [id]: newRole }));
    setMessage(null);
  };

  const saveRole = async (id) => {
    try {
      await update(ref(db, `users/${id}`), { role: roles[id] });
      setMessage({ type: "success", text: "Rol başarıyla güncellendi." });
    } catch (err) {
      console.error("Rol güncelleme hatası:", err);
      setMessage({ type: "danger", text: "Rol güncellenirken hata oluştu." });
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      // İlk olarak yeni reference oluştur
      const newCatRef = push(ref(db, "categories"));
      // Veriyi yeni oluşturulan reference'e set et
      await set(newCatRef, { name: newCategory.trim() });
      // State güncellemesi
      setCategories(prev => [...prev, { id: newCatRef.key, name: newCategory.trim() }]);
      setNewCategory("");
      setMessage({ type: "success", text: "Kategori başarıyla eklendi." });
    } catch (err) {
      console.error("Kategori ekleme hatası:", err);
      // Hata mesajını daha açıklayıcı göster
      setMessage({ type: "danger", text: `Kategori eklenirken hata oluştu: ${err.message}` });
    }
  };

  if (loading) {
    return (
      <Container fluid className="vh-100 d-flex justify-content-center align-items-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h3 className="mb-4 text-primary">🧠 Admin Paneli</h3>
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Row className="mb-4">
        {[
          { title: "📦 Ürün Sayısı", value: products.length },
          { title: "🧾 Bugünkü Giriş", value: todayEntries.length },
          { title: "💰 Toplam Tutar", value: `₺${totalAmount.toFixed(2)}` },
        ].map((stat, idx) => (
          <Col xs={12} md={4} key={idx} className="mb-3">
            <Card className="text-center shadow-sm p-3">
              <Card.Title>{stat.title}</Card.Title>
              <Card.Subtitle className="display-6">{stat.value}</Card.Subtitle>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="gy-4">
        <Col lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5>🔐 Kullanıcı Rolleri</h5>
            </Card.Header>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-light">
                  <tr>
                    <th>E-posta</th>
                    <th>Eski Rol</th>
                    <th>Yeni Rol</th>
                    <th>Kaydet</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={roles[u.id] || "user"}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </Form.Select>
                      </td>
                      <td>
                        <Button size="sm" onClick={() => saveRole(u.id)}>
                          Kaydet
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5>📚 Kategori Yönetimi</h5>
            </Card.Header>
            <Card.Body>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder="Yeni kategori"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button variant="primary" onClick={addCategory}>
                  Ekle
                </Button>
              </InputGroup>
              <div>
                {categories.map((c) => (
                  <Badge key={c.id} bg="info" className="me-2 mb-2">
                    {c.name}
                  </Badge>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPanel;
