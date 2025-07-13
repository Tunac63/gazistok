import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Button,
  Alert,
  Spinner,
  Badge,
  InputGroup,
  Modal,
} from "react-bootstrap";
import { db } from "../firebase/config";
import { ref, get, update, push, set, remove } from "firebase/database";



function AdminPanel() {

  // Bildirim gönderme için state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  // Tüm kullanıcılara gönderim için token state kaldırıldı
  const [notifSending, setNotifSending] = useState(false);

  // Bildirim gönderme fonksiyonu
  // Tüm kullanıcılara bildirim gönderen fonksiyon
  const sendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle || !notifBody) {
      setMessage({ type: "danger", text: "Başlık ve mesaj zorunlu." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    setNotifSending(true);
    try {
      // Tüm kullanıcıların FCM tokenlarını topla
      const tokens = users
        .map(u => u.fcmToken)
        .filter(token => token && typeof token === 'string' && token.length > 10);
      if (tokens.length === 0) {
        setMessage({ type: "danger", text: "Hiçbir kullanıcıda FCM token yok." });
        setShowToast(true);
        setNotifSending(false);
        return;
      }
      // Backend URL: .env dosyasındaki REACT_APP_FCM_BACKEND_URL veya fallback
      const backendUrl = process.env.REACT_APP_FCM_BACKEND_URL || window.REACT_APP_FCM_BACKEND_URL || "http://localhost:3002/send-fcm";
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifTitle,
          body: notifBody,
          tokens: tokens // toplu gönderim için dizi
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("FCM backend error:", response.status, errorText);
        throw new Error("FCM backend error: " + response.status);
      }
      setMessage({ type: "success", text: `Bildirim ${tokens.length} kullanıcıya gönderildi!` });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setNotifTitle("");
      setNotifBody("");
    } catch (err) {
      console.error("Bildirim gönderilemedi:", err);
      setMessage({ type: "danger", text: "Bildirim gönderilemedi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    setNotifSending(false);
  };

  // Şifre gönderme için modal ve fonksiyonlar
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCashRequest, setSelectedCashRequest] = useState(null);
  const [cashPasswordInput, setCashPasswordInput] = useState("");
  const [cashPasswordError, setCashPasswordError] = useState("");
  const [savingCashPassword, setSavingCashPassword] = useState(false);

  const handleOpenCashPasswordModal = (req) => {
    setSelectedCashRequest(req);
    setCashPasswordInput("");
    setCashPasswordError("");
    setShowPasswordModal(true);
  };

  const handleApproveCashPassword = async () => {
    if (!selectedCashRequest) return;
    if (!cashPasswordInput || cashPasswordInput.length < 4) {
      setCashPasswordError("Şifre en az 4 karakter olmalı.");
      return;
    }
    setSavingCashPassword(true);
    try {
      // Ortak şifreyi güncelle
      await set(ref(db, "cashEntryPassword"), cashPasswordInput);
      // Talep kaydını güncelle
      await set(ref(db, `cashPasswordRequests/${selectedCashRequest.id}`), {
        ...selectedCashRequest,
        status: "approved",
        assignedPassword: cashPasswordInput,
        approvedTime: Date.now()
      });
      setCashRequests((prev) => prev.map(r => r.id === selectedCashRequest.id ? { ...r, status: "approved", assignedPassword: cashPasswordInput } : r));
      setMessage({ type: 'success', text: `Şifre başarıyla kaydedildi ve gönderildi.` });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowPasswordModal(false);
      setSelectedCashRequest(null);
      setCashPasswordInput("");
      setCashPasswordError("");
    } catch (err) {
      setMessage({ type: 'danger', text: 'Şifre kaydedilemedi.' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    setSavingCashPassword(false);
  };
  // Mesaj state'i en başta tanımlanmalı
  const [message, setMessage] = useState(null);
  // Missing states and placeholders
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [cashRequests, setCashRequests] = useState([]);
  const [newCashPassword, setNewCashPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  // Temizlik raporları için state
  const [cleaningReports, setCleaningReports] = useState([]);

  // Placeholder functions
  const updateCashPassword = () => {};
  const handleRoleChange = (userId, value) => {
    setRoles((prev) => ({ ...prev, [userId]: value }));
  };
  // Kullanıcı rolünü kaydetme fonksiyonu
  const saveRole = async (userId) => {
    const newRole = roles[userId] || "user";
    try {
      await update(ref(db, `users/${userId}`), { role: newRole });
      setUsers((prev) => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setMessage({ type: "success", text: "Rol güncellendi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      setMessage({ type: "danger", text: "Rol güncellenemedi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // Kullanıcı silme fonksiyonu
  const deleteUser = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      await remove(ref(db, `users/${userId}`));
      setUsers((prev) => prev.filter(u => u.id !== userId));
      setMessage({ type: "success", text: "Kullanıcı silindi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      setMessage({ type: "danger", text: "Kullanıcı silinemedi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Ürünler
        const productsSnap = await get(ref(db, 'products'));
        let productsArr = [];
        if (productsSnap.exists()) {
          const val = productsSnap.val();
          productsArr = Object.entries(val).map(([id, p]) => ({ id, ...p }));
        }
        setProducts(productsArr);

        // Kullanıcılar
        const usersSnap = await get(ref(db, 'users'));
        let usersArr = [];
        if (usersSnap.exists()) {
          const val = usersSnap.val();
          usersArr = Object.entries(val).map(([id, u]) => ({ id, ...u }));
        }
        setUsers(usersArr);

        // Kategoriler
        const categoriesSnap = await get(ref(db, 'categories'));
        let categoriesArr = [];
        if (categoriesSnap.exists()) {
          const val = categoriesSnap.val();
          categoriesArr = Object.entries(val).map(([id, c]) => ({ id, ...c }));
        }
        setCategories(categoriesArr);

        // Kasa Şifre Talepleri
        const cashReqSnap = await get(ref(db, 'cashPasswordRequests'));
        let cashReqArr = [];
        if (cashReqSnap.exists()) {
          const val = cashReqSnap.val();
          cashReqArr = Object.entries(val).map(([id, req]) => ({ id, ...req }));
        }
        setCashRequests(cashReqArr);

        // Temizlik Raporları (Firebase'den dailytasks veya dailyTasks)
        // Path'i projenizdeki gerçek path'e göre değiştirin (ör: 'dailyTasks' veya 'dailytasks')
        const cleaningSnap = await get(ref(db, 'dailyTasks'));
        let cleaningArr = [];
        if (cleaningSnap.exists()) {
          const val = cleaningSnap.val();
          // Günlükler: { tarih: { report: [...] } } veya benzeri bir yapı bekleniyor
          cleaningArr = Object.entries(val).map(([date, data]) => ({ date, ...data }));
        }
        // Son 7 gün, en yeni en üstte
        setCleaningReports(cleaningArr.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7));
      } catch (err) {
        setMessage({ type: 'danger', text: 'Veriler alınırken hata oluştu.' });
      }
      setLoading(false);
    }
    fetchData();
  }, []);


  const deleteCategory = async (id) => {
    try {
      await remove(ref(db, `categories/${id}`));
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setMessage({ type: "success", text: "Kategori silindi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Kategori silme hatası:", err);
      setMessage({ type: "danger", text: "Kategori silinemedi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      const newRef = push(ref(db, "categories"));
      await set(newRef, { name: newCategoryName });
      setCategories((prev) => [...prev, { id: newRef.key, name: newCategoryName }]);
      setMessage({ type: "success", text: "Kategori eklendi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setNewCategoryName("");
    } catch (err) {
      setMessage({ type: "danger", text: "Kategori eklenemedi." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    setAddingCategory(false);
  };

  const compareProducts = (a, b) => {
    const sortByName = (arr) =>
      [...arr].sort((x, y) => (x.name > y.name ? 1 : -1));
    const sortedA = sortByName(a);
    const sortedB = sortByName(b);
    return (
      sortedA.length === sortedB.length &&
      sortedA.every(
        (p, i) =>
          p.name === sortedB[i].name &&
          parseFloat(p.quantity) === parseFloat(sortedB[i].quantity) &&
          parseFloat(p.unitPrice) === parseFloat(sortedB[i].unitPrice)
      )
    );
  };

  const approveEntry = async (id) => {
    try {
      const updates = {};
      updates[`entries/${id}/adminApproved`] = true;
      const entrySnap = await get(ref(db, `entries/${id}`));
      const entry = entrySnap.val();
      if (entry?.date && entry?.products) {
        const dateKey = new Date(entry.date)
          .toLocaleDateString("tr-TR")
          .split(".")
          .map((v) => v.padStart(2, "0"))
          .reverse()
          .join("-");
        const dailySnap = await get(ref(db, `dailyInvoices/${dateKey}`));
        if (dailySnap.exists()) {
          const dailyData = dailySnap.val();
          Object.entries(dailyData).forEach(([dId, d]) => {
            if (
              Array.isArray(d.products) &&
              compareProducts(d.products, entry.products)
            ) {
              updates[`dailyInvoices/${dateKey}/${dId}/approved`] = true;
            }
          });
        }
      }
      await update(ref(db), updates);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, adminApproved: true } : e))
      );
      setMessage({ type: "success", text: "Kayıt onaylandı." });
    } catch (err) {
      console.error("Onay hatası:", err);
      setMessage({ type: "danger", text: "Onay sırasında hata oluştu." });
    }
  };

  const unapprovedEntries = entries.filter(
    (e) => !e.adminApproved && e.products
  );

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setShowUserModal(false);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
      try {
        await remove(ref(db, `products/${productId}`));
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setMessage({ type: "success", text: "Ürün başarıyla silindi." });
      } catch (err) {
        console.error("Ürün silme hatası:", err);
        setMessage({
          type: "danger",
          text: "Ürün silinirken hata oluştu.",
        });
      }
    }
  };


  // Panel yukarı/aşağı kaydırma fonksiyonu
  function scrollToPanel(panelId, direction) {
    const order = ['cash-summary', 'products', 'categories', 'users'];
    const current = order.indexOf(panelId);
    if (current === -1) return;
    const target = current + direction;
    if (target < 0 || target >= order.length) return;
    const parent = document.querySelector('.row');
    if (!parent) return;
    const children = Array.from(parent.children);
    const from = children.findIndex(ch => ch.querySelector(`#${panelId}`));
    const to = children.findIndex(ch => ch.querySelector(`#${order[target]}`));
    if (from === -1 || to === -1) return;
    if (from === to) return;
    if (from < to) {
      parent.insertBefore(children[to], children[from]);
    } else {
      parent.insertBefore(children[from], children[to]);
    }
  }


  if (loading) {
    return (
      <Container
        fluid
        className="vh-100 d-flex justify-content-center align-items-center"
      >
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <>

      {/* FCM Bildirim Gönderme Paneli */}
      <Container className="mb-4">
        <Card className="shadow-sm">
          <Card.Header className="bg-white">
            <h5>🔔 FCM Bildirim Gönder (Tüm Kullanıcılara)</h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={sendNotification} className="row g-2 align-items-end">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Başlık</Form.Label>
                  <Form.Control type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Mesaj</Form.Label>
                  <Form.Control type="text" value={notifBody} onChange={e => setNotifBody(e.target.value)} required />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button type="submit" variant="success" disabled={notifSending} style={{ minWidth: 90 }}>
                  {notifSending ? "Gönderiliyor..." : "Gönder"}
                </Button>
              </Col>
            </Form>
            <div className="text-muted mt-2" style={{ fontSize: 13 }}>
              Not: Bildirim, FCM token'ı kayıtlı olan tüm kullanıcılara gönderilecektir.<br />
              <a href="https://firebase.google.com/docs/cloud-messaging/send-message" target="_blank" rel="noopener noreferrer">FCM HTTP API dokümantasyonu</a>
            </div>
          </Card.Body>
        </Card>
      </Container>

      <Container className="py-4">
        {/* Toast Bildirimi */}
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {showToast && message && (
            <div style={{ background: message.type === 'success' ? '#198754' : '#dc3545', color: '#fff', borderRadius: 8, padding: '10px 20px', minWidth: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Navigation Bar */}
        <nav style={{ marginBottom: 32 }}>
          <ul style={{ display: 'flex', gap: 32, listStyle: 'none', padding: 0, margin: 0, fontWeight: 600, fontSize: 17 }}>
            <li><a href="#cash-summary">Kasa Özeti</a></li>
            <li><a href="#products">Ürünler</a></li>
            <li><a href="#categories">Kategoriler</a></li>
            <li><a href="#users">Kullanıcılar</a></li>
            <li><a href="#cleaning-report">Temizlik Raporu</a></li>
          </ul>
        </nav>

        {/* Panelleri alt alta diz: her biri tam genişlikte */}
        <Row className="g-4 flex-column" style={{ minHeight: 220 }}>
          {/* Kasa Şifre Talepleri */}
          <Col xs={12}>
            <span id="cash-summary"></span>
            <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220 }}>
              <Card.Header className="bg-white d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: 17 }}>
                <span role="img" aria-label="Kasa">�</span> Kasa Şifre Talepleri
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-between">
                <div className="table-responsive" style={{ maxHeight: 140, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Kullanıcı</th>
                        <th>Talep Zamanı</th>
                        <th>Durum</th>
                        <th>Şifre Gönder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashRequests.length === 0 ? (
                        <tr><td colSpan={4} className="text-muted">Şifre talebi yok.</td></tr>
                      ) : (
                        cashRequests.map((req) => (
                          <tr key={req.id}>
                            <td>{req.user || req.email || '-'}</td>
                            <td>{req.requestTime ? new Date(req.requestTime).toLocaleString('tr-TR') : '-'}</td>
                            <td>{req.status === 'approved' ? <span style={{ color: '#198754' }}>Onaylandı</span> : <span style={{ color: '#dc3545' }}>Bekliyor</span>}</td>
                            <td>
                              <Button size="sm" variant="primary" disabled={req.status === 'approved'} onClick={() => handleOpenCashPasswordModal(req)}>
                                Onayla
                              </Button>
                            </td>
      {/* Kasa Şifre Onay Modalı */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Kasa Şifresi Belirle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">Kullanıcı: <b>{selectedCashRequest?.user || selectedCashRequest?.email || '-'}</b></div>
          <Form.Group>
            <Form.Label>Yeni Şifre (en az 4 karakter)</Form.Label>
            <Form.Control
              type="text"
              value={cashPasswordInput}
              onChange={e => setCashPasswordInput(e.target.value)}
              minLength={4}
              maxLength={32}
              autoFocus
              disabled={savingCashPassword}
            />
            {cashPasswordError && <div className="text-danger mt-2">{cashPasswordError}</div>}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={savingCashPassword}>Vazgeç</Button>
          <Button variant="success" onClick={handleApproveCashPassword} disabled={savingCashPassword}>{savingCashPassword ? "Kaydediliyor..." : "Onayla ve Kaydet"}</Button>
        </Modal.Footer>
      </Modal>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Ürünler Tablosu */}
          <Col xs={12}>
            <span id="products"></span>
            <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220, fontSize: 13 }}>
              <Card.Header className="bg-white d-flex align-items-center justify-content-between" style={{ padding: '8px 12px', fontWeight: 600, fontSize: 17 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span role="img" aria-label="Ürünler">📦</span> Ürünler
                </span>
                <span title="Yukarı/Aşağı Taşı" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', marginLeft: 6 }}>
                  <span onClick={() => scrollToPanel('products', -1)} style={{ lineHeight: 1, color: '#0d6efd', fontSize: 15, marginBottom: -2 }}>▲</span>
                  <span onClick={() => scrollToPanel('products', 1)} style={{ lineHeight: 1, color: '#0d6efd', fontSize: 15 }}>▼</span>
                </span>
              </Card.Header>
              <Card.Body className="p-2 d-flex flex-column justify-content-between">
                <div className="table-responsive" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover style={{ fontSize: 13, marginBottom: 0 }}>
                    <thead className="table-light">
                      <tr>
                        <th>Adı</th>
                        <th>Mik.</th>
                        <th>Fiyat</th>
                        <th>Sil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr><td colSpan={4} className="text-muted">Ürün yok.</td></tr>
                      ) : (
                        products.map((p) => (
                          <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{p.quantity}</td>
                            <td>{p.unitPrice}</td>
                            <td>
                              <Button variant="danger" size="sm" style={{ padding: '2px 7px', fontSize: 12 }} onClick={() => handleDeleteProduct(p.id)}>Sil</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Kullanıcılar Tablosu */}
          <Col xs={12}>
            <span id="users"></span>
            <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220 }}>
              <Card.Header className="bg-white d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: 17 }}>
                <span role="img" aria-label="Kullanıcılar">👤</span> Kullanıcılar
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-between">
                <div className="table-responsive" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Adı</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={4} className="text-muted">Kullanıcı yok.</td></tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <Form.Select size="sm" value={roles[u.id] || u.role || "user"} onChange={e => handleRoleChange(u.id, e.target.value)}>
                                <option value="user">Kullanıcı</option>
                                <option value="admin">Admin</option>
                              </Form.Select>
                            </td>
                            <td className="d-flex gap-2">
                              <Button variant="primary" size="sm" onClick={() => saveRole(u.id)}>Kaydet</Button>
                              <Button variant="danger" size="sm" onClick={() => deleteUser(u.id)}>Sil</Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Kategoriler Tablosu */}
          <Col xs={12}>
            <span id="categories"></span>
            <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220 }}>
              <Card.Header className="bg-white d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: 17 }}>
                <span role="img" aria-label="Kategoriler">🏷️</span> Kategoriler
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-between">
                <Form className="d-flex mb-2" onSubmit={addCategory}>
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder="Yeni kategori adı"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    style={{ maxWidth: 200, marginRight: 8 }}
                    disabled={addingCategory}
                  />
                  <Button type="submit" size="sm" variant="success" disabled={addingCategory || !newCategoryName.trim()}>
                    {addingCategory ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </Form>
                <div className="table-responsive" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Kategori Adı</th>
                        <th>Sil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length === 0 ? (
                        <tr><td colSpan={2} className="text-muted">Kategori yok.</td></tr>
                      ) : (
                        categories.map((cat) => (
                          <tr key={cat.id}>
                            <td>{cat.name}</td>
                            <td>
                              <Button variant="danger" size="sm" onClick={() => deleteCategory(cat.id)}>
                                Sil
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Günlük Temizlik Raporu */}
        <span id="cleaning-report"></span>
        <Card className="shadow-sm mt-4">
          <Card.Header className="bg-white">
            <h5>📊 Personel Temizlik Takip Raporu</h5>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <Table size="sm" bordered hover>
                <thead className="table-light">
                  <tr style={{ fontSize: 15 }}>
                    <th>Tarih</th>
                    <th>Saat</th>
                    <th>Kullanıcı</th>
                    <th>Görev</th>
                    <th>Onay</th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningReports.length === 0 ? (
                    <tr><td colSpan={5} className="text-muted">Kayıt yok.</td></tr>
                  ) : (
                    cleaningReports.flatMap((r, i) =>
                      (r.report || []).flatMap((task, j) =>
                        (task.logs || [])
                          .filter(log => log.approved !== undefined)
                          .map((log, k) => (
                            <tr key={i + '-' + j + '-' + k}>
                              <td>{r.date}</td>
                              <td>{log.time}</td>
                              <td>{
                                log.user && log.user.includes('@')
                                  ? log.user.split('@')[0]
                                  : log.user
                              }</td>
                              <td>{task.name}</td>
                              <td>
                                {log.approved === true ? (
                                  <span style={{ color: '#198754', fontWeight: 700, fontSize: 18 }} title="Admin onayladı">✔</span>
                                ) : log.approved === false ? (
                                  <span style={{ color: '#dc3545', fontWeight: 700, fontSize: 18 }} title="Admin reddetti">✖</span>
                                ) : null}
                              </td>
                            </tr>
                          ))
                      )
                    )
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

      </Container>
    </>
  );
}

export default AdminPanel;
