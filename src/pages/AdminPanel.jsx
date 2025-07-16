import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Table, Form, Button, Alert, Spinner, Badge, InputGroup, Modal } from "react-bootstrap";
import { db } from "../firebase/config";
import { ref, get, update, push, set, remove, onValue } from "firebase/database";
import CalendarDatePicker from "../components/CalendarDatePicker";



function AdminPanel() {
  // Tüm kodlar buraya alınacak
  // ...tüm state ve fonksiyonlar...
  // Siparişi onayla
  const [approvingOrderId, setApprovingOrderId] = useState(null);
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [supplyOrders, setSupplyOrders] = useState([]);
  const [message, setMessage] = useState(null);
  const [showToast, setShowToast] = useState(false);
  // Bildirim gönderme için state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [users, setUsers] = useState([]);
  // Şifre gönderme için modal ve fonksiyonlar
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCashRequest, setSelectedCashRequest] = useState(null);
  const [cashPasswordInput, setCashPasswordInput] = useState("");
  const [cashPasswordError, setCashPasswordError] = useState("");
  const [savingCashPassword, setSavingCashPassword] = useState(false);
  // Reddetme modal için state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  // ...tüm diğer state ve fonksiyonlar...
  // ...dosyanın geri kalanındaki kodlar...

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
      
      // Talep key'ini belirle (firebaseKey, id, uid veya timestamp)
      const requestKey = selectedCashRequest.firebaseKey || selectedCashRequest.id || selectedCashRequest.uid || Date.now();
      
      // Talep kaydını güncelle
      await set(ref(db, `cashPasswordRequests/${requestKey}`), {
        ...selectedCashRequest,
        status: "approved",
        assignedPassword: cashPasswordInput,
        approvedTime: Date.now()
      });
      
      setCashRequests((prev) => prev.map(r => 
        (r.firebaseKey === selectedCashRequest.firebaseKey || r.id === selectedCashRequest.id || r.uid === selectedCashRequest.uid) 
          ? { ...r, status: "approved", assignedPassword: cashPasswordInput } 
          : r
      ));
      setMessage({ type: 'success', text: `Şifre başarıyla kaydedildi ve gönderildi.` });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowPasswordModal(false);
      setSelectedCashRequest(null);
      setCashPasswordInput("");
      setCashPasswordError("");
    } catch (err) {
      console.error("Şifre kaydetme hatası:", err);
      setMessage({ type: 'danger', text: 'Şifre kaydedilemedi.' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    setSavingCashPassword(false);
  };

  // Kasa şifre talebini reddet - modal aç
  const handleRejectCashRequest = (request) => {
    setRequestToReject(request);
    setShowRejectModal(true);
  };

  // Reddetme onayı
  const confirmRejectCashRequest = async () => {
    if (!requestToReject) return;
    
    try {
      console.log("Reddedilecek talep:", requestToReject); // Debug
      // Firebase path key'ini kullan
      const requestKey = requestToReject.firebaseKey || requestToReject.id || requestToReject.uid || Date.now();
      console.log("Kullanılan key:", requestKey); // Debug
      
      // Talep kaydını güncelle
      await set(ref(db, `cashPasswordRequests/${requestKey}/status`), 'rejected');
      await set(ref(db, `cashPasswordRequests/${requestKey}/rejectedTime`), Date.now());
      
      // State güncellemesi - sadece belirli talebi güncelle
      setCashRequests((prev) => {
        console.log("Önceki cashRequests:", prev); // Debug
        const updated = prev.map(r => {
          if (r.firebaseKey === requestToReject.firebaseKey) {
            console.log("Bu talep güncelleniyor:", r); // Debug
            return { ...r, status: 'rejected', rejectedTime: Date.now() };
          }
          return r;
        });
        console.log("Güncellenmiş cashRequests:", updated); // Debug
        return updated;
      });
      
      setMessage({ type: 'success', text: 'Şifre talebi reddedildi.' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowRejectModal(false);
      setRequestToReject(null);
    } catch (err) {
      console.error("Reddetme hatası:", err);
      setMessage({ type: 'danger', text: 'Talep reddedilemedi: ' + err.message });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // Mesaj state'i en başta tanımlanmalı
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [entries, setEntries] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cashRequests, setCashRequests] = useState([]);
  const [newCashPassword, setNewCashPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [roles, setRoles] = useState({});
  // Temizlik raporları için state
  const [cleaningReports, setCleaningReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);

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

  // ...dosyanın geri kalanındaki kodlar...


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
          cashReqArr = Object.entries(val).map(([key, req]) => ({ 
            ...req,
            firebaseKey: key, // Firebase path key'ini sakla
            id: req.id || req.uid || key // id alanı yoksa uid'yi kullan, o da yoksa key'i kullan
          }));
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

  // Temizlik raporları için useEffect
  useEffect(() => {
    const dailyRef = ref(db, "dailyTasks");
    const unsub2 = onValue(dailyRef, (snap) => {
      const arr = [];
      if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([date, data]) => {
          arr.push({ date, ...data });
        });
      }
      setDailyReports(arr);
    });
    return () => {
      unsub2();
    };
  }, []);

  const handleApprove = async (approval) => {
    let today = approval.date;
    if (today && today.includes(".")) {
      const [d, m, y] = today.split(".");
      today = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (!today) {
      const now = new Date();
      today = now.toISOString().slice(0, 10);
    }
    const dailyRef = ref(db, `dailyTasks/${today}/report`);
    let currentReport = [];
    try {
      const snap = await get(dailyRef);
      if (snap.exists()) {
        currentReport = snap.val();
      }
    } catch {}

    let found = false;
    let subtaskLogs = [];
    if (approval.subtasksStatus && Array.isArray(approval.subtasksStatus)) {
      approval.subtasksStatus.forEach((sub, subIdx) => {
        subtaskLogs.push({
          user: approval.user,
          time: approval.time,
          date: approval.date,
          approved: true,
          subtaskName: sub.name,
          isSubtask: true,
          subtaskIdx: subIdx,
          subtaskStatus: sub.status === true,
        });
      });
    }
    const newReport = (currentReport || []).map((task) => {
      if (task.name === approval.taskName) {
        found = true;
        return {
          ...task,
          logs: [...(task.logs || []), { ...approval, approved: true }, ...subtaskLogs],
        };
      }
      return task;
    });
    if (!found) {
      newReport.push({
        name: approval.taskName,
        logs: [{ ...approval, approved: true }, ...subtaskLogs],
      });
    }
    await set(dailyRef, newReport);
    await remove(ref(db, `pendingCleaningApprovals/${approval.id}`));
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks];
      if (updatedTasks[approval.taskIdx]) {
        updatedTasks[approval.taskIdx].subtasks = (updatedTasks[approval.taskIdx].subtasks || []).map((s) => ({
          ...s,
          status: false,
        }));
      }
      return updatedTasks;
    });
    localStorage.setItem("dailyTasks", JSON.stringify(tasks));
  };

  // Panel yukarı/aşağı kaydırma fonksiyonu
  function scrollToPanel(panelId, direction) {
    const order = ['cash-summary', 'products', 'categories', 'users', 'cleaning-report'];
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

  const defaultTasks = [
    { name: 'Tuvalet Temizliği', logs: [], subtasks: [] },
    { name: 'Bar Kapanış Temizliği', logs: [], subtasks: [] },
    { name: 'Açılış Hazırlığı', logs: [], subtasks: [] },
    { name: 'Kapanış Kontrolü', logs: [], subtasks: [] },
    { name: 'Mutfak Kapanış Temizliği', logs: [], subtasks: [] },
    { name: 'Merdiven Temizliği', logs: [], subtasks: [] },
    { name: 'Mutfak Açılış Kontrolü', logs: [], subtasks: [] },
  ];
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('dailyTasks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(t => ({
          ...t,
          subtasks: (t.subtasks || []).map(s => ({ ...s, status: false }))
        }));
      } catch {
        return defaultTasks;
      }
    }
    return defaultTasks;
  });

  // Şifre Talepleri için state'ler
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordApprovalModal, setShowPasswordApprovalModal] = useState(false);

  // Şifre talep onaylama modalını aç
  const handleOpenPasswordModal = (request) => {
    setSelectedRequest(request);
    setNewPassword("");
    setShowPasswordApprovalModal(true);
  };

  // Şifre talebini onayla ve şifreyi ata
  const handleAssignPassword = async () => {
    if (!selectedRequest) return;
    if (newPassword.length < 4) {
      setMessage({ type: "danger", text: "Şifre en az 4 haneli olmalıdır." });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }
    try {
      // Kullanıcının şifresini güncelle
      await set(ref(db, `users/${selectedRequest.uid}/password`), newPassword);
      // Talep kaydını güncelle
      await set(ref(db, `passwordRequests/${selectedRequest.id}`), {
        ...selectedRequest,
        status: "approved",
        assignedPassword: newPassword,
        approvedTime: Date.now()
      });
      setPasswordRequests((prev) => prev.map(req => req.id === selectedRequest.id ? { ...req, status: "approved", assignedPassword: newPassword } : req));
      setMessage({ type: 'success', text: `Şifre başarıyla atandı ve talep onaylandı.` });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      setShowPasswordApprovalModal(false);
      setSelectedRequest(null);
      setNewPassword("");
    } catch (err) {
      setMessage({ type: 'danger', text: 'Şifre atanamadı.' });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // Şifre taleplerini çek
  useEffect(() => {
    async function fetchPasswordRequests() {
      try {
        const snap = await get(ref(db, "passwordRequests"));
        if (snap.exists()) {
          const val = snap.val();
          const reqs = Object.entries(val).map(([key, req]) => ({
            ...req,
            firebaseKey: key,
            id: req.id || key
          })).sort((a, b) => b.requestTime - a.requestTime);
          setPasswordRequests(reqs);
        } else {
          setPasswordRequests([]);
        }
      } catch (err) {
        console.error("Şifre talepleri alınamadı:", err);
      }
    }
    fetchPasswordRequests();
  }, []);

  const handleApproveOrder = async (orderId) => {
    setApprovingOrderId(orderId);
    try {
      // Onaylama işlemi
      await update(ref(db, `orders/${orderId}`), { status: 'approved' });
      setSupplyOrders((prev) => prev.map(order => order.id === orderId ? { ...order, status: 'approved' } : order));
      setMessage({ type: 'success', text: 'Sipariş başarıyla onaylandı.' });
    } catch (err) {
      setMessage({ type: 'danger', text: 'Sipariş onaylanamadı.' });
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleRejectOrder = async (orderId) => {
    setRejectingOrderId(orderId);
    try {
      // Reddetme işlemi
      await update(ref(db, `orders/${orderId}`), { status: 'rejected' });
      setSupplyOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status: 'rejected' } : order));
      setMessage({ type: 'success', text: 'Sipariş başarıyla reddedildi.' });
    } catch (err) {
      setMessage({ type: 'danger', text: 'Sipariş reddedilemedi.' });
    } finally {
      setRejectingOrderId(null);
    }
  };

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
    <React.Fragment>
      {/* Navigation Bar - Modern Style */}
      <nav style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
        <ul style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          listStyle: 'none',
          padding: '12px 0',
          margin: 0,
          fontWeight: 700,
          fontSize: 18,
          background: 'linear-gradient(90deg, #f5f7fa 0%, #e9eff5 100%)',
          borderRadius: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          minWidth: 0,
          maxWidth: 900,
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* ...navigation items... */}
        </ul>
      </nav>

      <Container>
        <Row className="g-4 flex-column" style={{ minHeight: 220 }}>
          {/* Kasa Şifre Talepleri Paneli (eski yeri değişmedi) */}
          {/* ...diğer paneller... */}
          {/* Tedarik Siparişleri Paneli (artık navbarın altında, duplicate navbar kaldırıldı) */}
          <Col xs={12}>
            <Container className="mb-4 p-0">
              <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220 }}>
                <Card.Header className="bg-white d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: 17 }}>
                  <span role="img" aria-label="Tedarik">🚚</span> Tedarik Siparişleri
                </Card.Header>
                <Card.Body className="d-flex flex-column justify-content-between">
                  <div className="table-responsive" style={{ maxHeight: 180, overflowY: 'auto' }}>
                    <Table size="sm" bordered hover>
                      <thead className="table-light">
                        <tr>
                          <th>Gönderen</th>
                          <th>Tarih</th>
                          <th>Ürünler</th>
                          <th>Durum</th>
                          <th>Onay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplyOrders.filter(order => order.status !== 'approved').length === 0 ? (
                          <tr><td colSpan={5} className="text-muted">Bekleyen veya reddedilen sipariş yok.</td></tr>
                        ) : (
                          supplyOrders.filter(order => order.status !== 'approved').map(order => {
                            let sender = order.user;
                            if (typeof sender === 'string' && sender.includes('@')) {
                              const match = sender.match(/@([^\.]+)\./);
                              sender = match ? match[1] : sender;
                            }
                            return (
                              <tr key={order.id}>
                                <td>{sender}</td>
                                <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                                <td>
                                  {order.products && order.products.length > 0 ? (
                                    <ul style={{margin:0,paddingLeft:18}}>
                                      {order.products.map((p,i) => (
                                        <li key={i}>{p.name} <b>x{p.quantity}</b> {p.unit && <span>({p.unit})</span>}</li>
                                      ))}
                                    </ul>
                                  ) : '-'}
                                </td>
                                <td>
                                  {order.status === 'rejected' ? (
                                    <span style={{ color: '#dc3545' }}>Reddedildi</span>
                                  ) : (
                                    <span style={{ color: '#dc3545' }}>Bekliyor</span>
                                  )}
                                </td>
                                <td style={{display:'flex',gap:8}}>
                                  {order.status === 'pending' ? (
                                    <>
                                      <Button size="sm" variant="success" disabled={approvingOrderId === order.id} onClick={() => handleApproveOrder(order.id)}>
                                        {approvingOrderId === order.id ? 'Onaylanıyor...' : 'Onayla'}
                                      </Button>
                                      <Button size="sm" variant="danger" disabled={rejectingOrderId === order.id} onClick={() => handleRejectOrder(order.id)}>
                                        {rejectingOrderId === order.id ? 'Reddediliyor...' : 'Reddet'}
                                      </Button>
                                    </>
                                  ) : order.status === 'rejected' ? (
                                    <span style={{color:'#dc3545'}}>✖</span>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Container>
          </Col>
          {/* ...other panels (Kategoriler, Kullanıcılar, Temizlik Raporu, vs.) ... */}
        </Row>
      </Container>

      <Container className="py-4">
        {/* Toast Bildirimi */}
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
          {showToast && message && (
            <div style={{ 
              background: message.type === 'success' 
                ? '#198754' 
                : '#f3f3f3', 
              color: message.type === 'success' 
                ? '#fff' 
                : '#333', 
              borderRadius: 8, 
              padding: '10px 20px', 
              minWidth: 180, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              border: message.type === 'success' ? 'none' : '1px solid #bbb',
              fontWeight: 500,
              fontSize: 16
            }}>
              {message.text}
            </div>
          )}
        </div>

        {/* Panelleri alt alta diz: her biri tam genişlikte */}
        <Row className="g-4 flex-column" style={{ minHeight: 220 }}>
          {/* Kasa Şifre Talepleri */}
          <Col xs={12}>
            <span id="cash-summary"></span>
            <Card className="shadow rounded-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: 220 }}>
              <Card.Header className="bg-white d-flex align-items-center gap-2" style={{ fontWeight: 600, fontSize: 17 }}>
                <span role="img" aria-label="Kasa">🔒</span> Kasa Şifre Talepleri
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-between">
                <div className="table-responsive" style={{ maxHeight: 140, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Kullanıcı</th>
                        <th>Talep Zamanı</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashRequests.filter(r => r.status === 'pending' || !r.status).length === 0 ? (
                        <tr><td colSpan={4} className="text-muted">Bekleyen şifre talebi yok.</td></tr>
                      ) : (
                        cashRequests.filter(r => r.status === 'pending' || !r.status).map((req) => {
                          let displayUser = 'Bilinmeyen Kullanıcı';
                          
                          // Debug: Her talep için key kontrolü
                          console.log("Render edilen talep:", {
                            firebaseKey: req.firebaseKey,
                            id: req.id,
                            uid: req.uid,
                            user: req.user,
                            status: req.status
                          });
                          
                          // Önce req.user kontrolü yap
                          if (req.user && typeof req.user === 'string' && req.user.trim() !== '' && req.user !== 'Bilinmeyen Kullanıcı') {
                            displayUser = req.user.toUpperCase();
                          }
                          // Sonra email kontrolü yap - daha esnek pattern
                          else if (req.email && typeof req.email === 'string' && req.email.trim() !== '') {
                            // Gazi pattern'i dene
                            const gaziMatch = req.email.match(/gazi@([^\.@]+)/);
                            if (gaziMatch && gaziMatch[1]) {
                              displayUser = gaziMatch[1].toUpperCase();
                            } 
                            // Normal email pattern'i dene
                            else {
                              const emailMatch = req.email.match(/^([^@]+)@/);
                              if (emailMatch && emailMatch[1]) {
                                displayUser = emailMatch[1].toUpperCase();
                              } else {
                                displayUser = req.email.toUpperCase();
                              }
                            }
                          }
                          // uid varsa users listesinden kullanıcı adını bul
                          else if (req.uid) {
                            const user = users.find(u => u.id === req.uid);
                            if (user && user.name) {
                              displayUser = user.name.toUpperCase();
                            } else if (user && user.email) {
                              const emailMatch = user.email.match(/^([^@]+)@/);
                              displayUser = emailMatch ? emailMatch[1].toUpperCase() : user.email.toUpperCase();
                            }
                          }
                          return (
                            <tr key={req.firebaseKey || req.id || req.uid}>
                              <td>{displayUser}</td>
                              <td>{req.requestTime ? new Date(req.requestTime).toLocaleString('tr-TR') : '-'}</td>
                              <td>{req.status === 'approved' ? <span style={{ color: '#198754' }}>Onaylandı</span> : req.status === 'rejected' ? <span style={{ color: '#dc3545' }}>Reddedildi</span> : <span style={{ color: '#ffc107' }}>Bekliyor</span>}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button size="sm" variant="primary" disabled={req.status !== 'pending'} onClick={() => {
                                    setSelectedCashRequest(req);
                                    setCashPasswordInput("");
                                    setCashPasswordError("");
                                    setShowPasswordModal(true);
                                  }}>
                                    Onayla
                                  </Button>
                                  <Button size="sm" variant="danger" disabled={req.status !== 'pending'} onClick={() => handleRejectCashRequest(req)}>
                                    Reddet
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
            {/* Modal should be rendered once, outside the Table */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>Kasa Şifresi Belirle</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <div className="mb-2">Kullanıcı: <b>{(() => {
                  let displayUser = 'Bilinmeyen Kullanıcı';
                  const req = selectedCashRequest;
                  if (!req) return displayUser;
                  
                  // Önce req.user kontrolü yap
                  if (req.user && typeof req.user === 'string' && req.user.trim() !== '' && req.user !== 'Bilinmeyen Kullanıcı') {
                    displayUser = req.user.toUpperCase();
                  }
                  // Sonra email kontrolü yap
                  else if (req.email && typeof req.email === 'string' && req.email.trim() !== '') {
                    const gaziMatch = req.email.match(/gazi@([^\.@]+)/);
                    if (gaziMatch && gaziMatch[1]) {
                      displayUser = gaziMatch[1].toUpperCase();
                    } else {
                      const emailMatch = req.email.match(/^([^@]+)@/);
                      if (emailMatch && emailMatch[1]) {
                        displayUser = emailMatch[1].toUpperCase();
                      } else {
                        displayUser = req.email.toUpperCase();
                      }
                    }
                  }
                  // uid varsa users listesinden kullanıcı adını bul
                  else if (req.uid) {
                    const user = users.find(u => u.id === req.uid);
                    if (user && user.name) {
                      displayUser = user.name.toUpperCase();
                    } else if (user && user.email) {
                      const emailMatch = user.email.match(/^([^@]+)@/);
                      displayUser = emailMatch ? emailMatch[1].toUpperCase() : user.email.toUpperCase();
                    }
                  }
                  return displayUser;
                })()}</b></div>
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

            {/* Reddetme Onay Modalı */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
              <Modal.Header closeButton style={{ borderBottom: '2px solid #dc3545' }}>
                <Modal.Title style={{ color: '#dc3545', fontWeight: 'bold' }}>
                  <span style={{ fontSize: '1.2em', marginRight: '8px' }}>⚠️</span>
                  Şifre Talebini Reddet
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ 
                  background: '#ffeaa7', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '15px',
                  border: '1px solid #fdcb6e'
                }}>
                  <div style={{ fontSize: '2em', marginBottom: '10px' }}>🚫</div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '1.1em' }}>
                    Kullanıcı: <span style={{ color: '#2d3436' }}>{requestToReject?.user || 'Bilinmeyen'}</span>
                  </div>
                  <div style={{ color: '#636e72', fontSize: '0.9em' }}>
                    Bu şifre talebini reddetmek istediğinize emin misiniz?
                  </div>
                </div>
                <div style={{ color: '#636e72', fontSize: '0.85em', fontStyle: 'italic' }}>
                  Reddedilen talepler listeden kaldırılacaktır.
                </div>
              </Modal.Body>
              <Modal.Footer style={{ justifyContent: 'center', gap: '15px', padding: '20px' }}>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => setShowRejectModal(false)}
                  style={{ minWidth: '100px', fontWeight: 'bold' }}
                >
                  ❌ Vazgeç
                </Button>
                <Button 
                  variant="danger" 
                  onClick={confirmRejectCashRequest}
                  style={{ 
                    minWidth: '100px', 
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #e74c3c, #c0392b)',
                    border: 'none'
                  }}
                >
                  🗑️ Reddet
                </Button>
              </Modal.Footer>
            </Modal>
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

        {/* Şifre Talepleri Paneli */}
        <Row className="g-4" style={{ marginTop: 32 }}>
          <Col xs={12}>
            <Card className="shadow rounded-4">
              <Card.Header className="bg-white" style={{ fontWeight: 600, fontSize: 17 }}>
                <span role="img" aria-label="Şifre Talepleri">🔑</span> Şifre Talepleri
              </Card.Header>
              <Card.Body>
                <div className="table-responsive" style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <Table size="sm" bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th>Kullanıcı</th>
                        <th>Talep Zamanı</th>
                        <th>Durum</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passwordRequests.filter(r => r.status === 'pending' || !r.status).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-muted">Bekleyen şifre talebi yok.</td>
                        </tr>
                      ) : (
                        passwordRequests.filter(r => r.status === 'pending' || !r.status).map((req) => (
                          <tr key={req.id}>
                            <td>{req.user?.toUpperCase() || 'BİLİNMEYEN'}</td>
                            <td>{new Date(req.requestTime || req.timestamp || Date.now()).toLocaleString()}</td>
                            <td>{req.status === "approved" ? "Onaylandı" : "Bekliyor"}</td>
                            <td>
                              {req.status === "approved" ? (
                                <>
                                  <Button variant="danger" size="sm" style={{marginRight:6}} onClick={handleDeletePasswordRequest(req)}>Sil</Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="primary" size="sm" style={{marginRight:6}} onClick={() => handleOpenPasswordModal(req)}>Onayla</Button>
                                  <Button variant="danger" size="sm" onClick={handleRejectPasswordRequest(req)}>Reddet</Button>
                                </>
                              )}
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

      {/* Şifre Belirleme Modalı */}
      <Modal show={showPasswordApprovalModal} onHide={() => setShowPasswordApprovalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Şifre Belirle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Yeni Şifre</Form.Label>
            <Form.Control
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={4}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPasswordApprovalModal(false)}>İptal</Button>
          <Button variant="success" onClick={handleAssignPassword}>Onayla</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  </React.Fragment>
  );

  // Şifre talebini sil
  function handleDeletePasswordRequest(req) {
    return async () => {
      try {
        const requestKey = req.firebaseKey || req.id;
        await remove(ref(db, `passwordRequests/${requestKey}`));
        setPasswordRequests(prev => prev.filter(r => 
          r.firebaseKey !== req.firebaseKey && r.id !== req.id
        ));
        setMessage({ type: 'success', text: 'Talep silindi.' });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        setMessage({ type: 'danger', text: 'Talep silinemedi.' });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    };
  }

  // Şifre talebini reddet
  function handleRejectPasswordRequest(req) {
    return async () => {
      try {
        const requestKey = req.firebaseKey || req.id;
        await set(ref(db, `passwordRequests/${requestKey}/status`), 'rejected');
        await set(ref(db, `passwordRequests/${requestKey}/rejectedTime`), Date.now());
        setPasswordRequests(prev => prev.map(r => 
          (r.firebaseKey === req.firebaseKey || r.id === req.id) 
            ? { ...r, status: 'rejected', rejectedTime: Date.now() } 
            : r
        ));
        setMessage({ type: 'success', text: 'Talep reddedildi.' });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } catch (err) {
        console.error("Reddetme hatası:", err);
        setMessage({ type: 'danger', text: 'Talep reddedilemedi.' });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    };
  }
}

export default AdminPanel;