import React, { useEffect, useState, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  InputGroup,
  Table,
  Card,
  Alert,
} from "react-bootstrap";
import { db } from "../firebase/config";
import { ref, get, set, remove } from "firebase/database";
import {
  format,
  parseISO,
  isBefore,
  isAfter,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CSVLink } from "react-csv";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Soft tasarım stilleri
const softStyles = {
  container: {
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    border: 'none',
    backdropFilter: 'blur(10px)',
  },
  card: {
    borderRadius: '16px',
    border: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
  },
  formControl: {
    borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  button: {
    borderRadius: '12px',
    fontWeight: '600',
    textTransform: 'none',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
    color: 'white',
  },
  successButton: {
    background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
    color: 'white',
  },
  warningButton: {
    background: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
    color: '#212529',
  },
  table: {
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    border: 'none',
  },
  badge: {
    borderRadius: '8px',
    padding: '6px 12px',
    fontWeight: '500',
    fontSize: '12px',
  }
};


export default function CashEntry() {
  // Ana state'ler
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPass, setCheckingPass] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entryDate, setEntryDate] = useState("");
  const [prevValue, setPrevValue] = useState("");
  const [savedPrev, setSavedPrev] = useState(false);
  const [cashIn, setCashIn] = useState("");
  const [visaIn, setVisaIn] = useState("");
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [approvedExpenses, setApprovedExpenses] = useState([]);
  const [adisyonCount, setAdisyonCount] = useState("");
  const [note, setNote] = useState("");
  const [prevCarry, setPrevCarry] = useState(0);
  const [todayCashCarry, setTodayCashCarry] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [prevSuccess, setPrevSuccess] = useState("");
  const defaultFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(new Date()), "yyyy-MM-dd");
  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(defaultTo);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const todayISO = format(new Date(), "yyyy-MM-dd");
  // Şifre talep ekranı için state'ler (her zaman en üstte tanımlanmalı)
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);
  // Kullanıcı email veya uid alınmalı, örnek olarak localStorage'dan veya props'tan alınabilir
  const userEmail = localStorage.getItem("userEmail") || "";
  const userUid = localStorage.getItem("userUid") || "";
  // Şifre talep fonksiyonu
  // Şifre talebi sadece kayıt oluşturacak, şifre atamayacak
  const handleRequestPassword = async () => {
    setRequesting(true);
    setRequestError("");
    try {
      const reqRef = ref(db, `cashPasswordRequests/${userUid || Date.now()}`);
      await set(reqRef, {
        user: userEmail || "Bilinmeyen Kullanıcı",
        email: userEmail,
        uid: userUid,
        requestTime: Date.now(),
        status: "pending"
      });
      setRequestSent(true);
    } catch (err) {
      setRequestError("Talep gönderilemedi. Lütfen tekrar deneyin.");
    }
    setRequesting(false);
  };
  // Modal ve admin işlemleri için state'ler
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordRequests, setPasswordRequests] = useState([]);

  const handleOpenPasswordModal = (req) => {
    setSelectedRequest(req);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const fmt = (v) =>
    (isNaN(parseFloat(v)) ? 0 : parseFloat(v)).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const hoverGreen = {
    onMouseEnter: (e) => (e.target.style.backgroundColor = "#d4edda"),
    onMouseLeave: (e) => (e.target.style.backgroundColor = ""),
  };

  const handlePasswordSubmit = async () => {
    const passSnap = await get(ref(db, "cashEntryPassword"));
    const realPassword = passSnap.exists() ? passSnap.val() : "";
    if (passwordInput === realPassword) {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("❌ Şifre hatalı. Lütfen tekrar deneyin.");
    }
  };

  useEffect(() => {
    (async () => {
      const snap = await get(ref(db, "cashEntryPassword"));
      if (!snap.exists()) setIsAuthenticated(true);
      setCheckingPass(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const snap = await get(ref(db, "cashRecords"));
      const recs = [];
      if (snap.exists()) {
        for (const [date, v] of Object.entries(snap.val())) {
          const exp = Array.isArray(v.expenses) ? v.expenses : [];
          const cashExp = exp
            .filter((e) => e.type === "cash")
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          const visaExp = exp
            .filter((e) => e.type === "visa")
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          recs.push({
            date,
            cashIn: v.cashIn || 0,
            visaIn: v.visaIn || 0,
            cashExp,
            visaExp,
            totalSale: (v.cashIn || 0) + (v.visaIn || 0),
            note: v.note || "",
          });
        }
        recs.sort((a, b) => (a.date < b.date ? 1 : -1));
      }
      setAllRecords(recs);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!showForm) return;
    (async () => {
      setLoading(true);
      const snap = await get(ref(db, `cashRecords/${entryDate}`));
      if (snap.exists()) {
        const d = snap.val();
        setPrevCarry(d.prevCarry || 0);
        setPrevValue(String(d.prevCarry || 0));
        setSavedPrev(true);
        setCashIn(String(d.cashIn || ""));
        setVisaIn(String(d.visaIn || ""));
        setApprovedExpenses(Array.isArray(d.expenses) ? d.expenses : []);
        setAdisyonCount(String(d.adisyonCount || ""));
        setNote(d.note || "");
      } else {
        const pd = parseISO(entryDate);
        pd.setDate(pd.getDate() - 1);
        const ps = await get(
          ref(db, `cashRecords/${format(pd, "yyyy-MM-dd")}/todayCashCarry`)
        );
        const pc = ps.exists() ? parseFloat(ps.val()) || 0 : 0;
        setPrevCarry(pc);
        setPrevValue(String(pc));
        setSavedPrev(false);
        setCashIn("");
        setVisaIn("");
        setApprovedExpenses([]);
        setAdisyonCount("");
        setNote("");
      }
      setLoading(false);
    })();
  }, [showForm, entryDate]);

  useEffect(() => {
    const ci = parseFloat(cashIn) || 0;
    const cExp = approvedExpenses
      .filter((e) => e.type === "cash")
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    setTodayCashCarry(prevCarry + ci - cExp);
  }, [prevCarry, cashIn, approvedExpenses]);

  const allowPrev = allRecords.length === 0;

  const savePrev = async () => {
    const v = parseFloat(prevValue);
    if (isNaN(v) || v < 0) {
      setError("Lütfen geçerli bir sayı girin.");
      return;
    }
    await set(ref(db, `cashRecords/${entryDate}/prevCarry`), v);
    setPrevCarry(v);
    setSavedPrev(true);
    setError(null);
    setPrevSuccess("Önceki devir kaydedildi");
  };

  const addExpense = () =>
    setPendingExpenses((p) => [...p, { desc: "", amount: "", type: "cash" }]);
  const remPending = (i) =>
    setPendingExpenses((p) => p.filter((_, j) => j !== i));
  const updPending = (i, f, v) => {
    const p = [...pendingExpenses];
    p[i][f] = v;
    setPendingExpenses(p);
  };
  const approveExpenses = () => {
    setApprovedExpenses((a) => [...a, ...pendingExpenses]);
    setPendingExpenses([]);
  };

  const handleNew = () => {
    setShowForm(true);
    setEntryDate(todayISO);
    setPrevValue("");
    setCashIn("");
    setVisaIn("");
    setPendingExpenses([]);
    setApprovedExpenses([]);
    setAdisyonCount("");
    setNote("");
    setPrevCarry(0);
    setSavedPrev(false);
    setError(null);
    setSuccessMessage("");
    setPrevSuccess("");
  };

  const saveRecord = async () => {
    setLoading(true);
    await set(ref(db, `cashRecords/${entryDate}`), {
      prevCarry,
      cashIn: parseFloat(cashIn) || 0,
      visaIn: parseFloat(visaIn) || 0,
      expenses: approvedExpenses,
      adisyonCount: parseInt(adisyonCount) || 0,
      note,
      todayCashCarry,
    });
    const snap = await get(ref(db, "cashRecords"));
    const recs = [];
    if (snap.exists()) {
      for (const [date, v] of Object.entries(snap.val())) {
        const exp = Array.isArray(v.expenses) ? v.expenses : [];
        recs.push({
          date,
          cashIn: v.cashIn || 0,
          visaIn: v.visaIn || 0,
          cashExp: exp
            .filter((e) => e.type === "cash")
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
          visaExp: exp
            .filter((e) => e.type === "visa")
            .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
          totalSale: (v.cashIn || 0) + (v.visaIn || 0),
          note: v.note || "",
        });
      }
      recs.sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    setAllRecords(recs);
    setLoading(false);
    setShowForm(false);
    setSuccessMessage(`${format(parseISO(entryDate), "dd-MM-yyyy")} tarihli kasa girişi başarılı.`);
  };

  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      let ok = true;
      if (filterFrom) ok = ok && !isBefore(parseISO(r.date), parseISO(filterFrom));
      if (filterTo) ok = ok && !isAfter(parseISO(r.date), parseISO(filterTo));
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        ok =
          ok &&
          (r.note.toLowerCase().includes(term) ||
            r.totalSale.toString().includes(term));
      }
      return ok;
    });
  }, [allRecords, filterFrom, filterTo, searchTerm]);

  if (checkingPass) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6}>
            <Card className="p-4 shadow-sm bg-light border-0">
              <h4 className="mb-3 text-center text-dark">🔐 Kasa Erişimi</h4>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordSubmit();
                }}
              >
                <Form.Group className="mb-3">
                  <Form.Control
                    type="password"
                    placeholder="Şifre"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                  {passwordError && (
                    <div className="text-danger mt-2">{passwordError}</div>
                  )}
                </Form.Group>
                <Button type="submit" variant="dark" className="w-100">
                  Giriş Yap
                </Button>
              </Form>
              <div className="text-muted small mt-3 text-center">
                Şifreyi bilmiyorsan yöneticiden talep et.
              </div>
              <div className="d-grid gap-2 mt-3">
                <Button
                  variant="outline-primary"
                  disabled={requestSent || requesting}
                  onClick={handleRequestPassword}
                >
                  {requestSent ? "Talep Gönderildi" : requesting ? "Gönderiliyor..." : "Şifre Talep Et"}
                </Button>
                {requestError && <div className="text-danger mt-2">{requestError}</div>}
                {requestSent && <div className="text-success mt-2">Talebiniz yöneticilere iletildi.</div>}
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // --- PAGINATION ---------------------------------------------------------
  const pageCount = Math.ceil(filtered.length / recordsPerPage);
  const pageData = filtered.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // --- CHART DATA ---------------------------------------------------------
  const chartData = filtered
    .map((r) => ({ date: format(parseISO(r.date), "dd/MM"), ciro: r.totalSale }))
    .reverse();

  if (loading) {
    return (
      <Container className="text-center py-5 bg-light">
        <Spinner animation="border" />
      </Container>
    );
  }

  // --- SUMMARY AGGREGATES -----------------------------------------------
  const sumCashIn = filtered.reduce((s, r) => s + (parseFloat(r.cashIn) || 0), 0);
  const sumVisaIn = filtered.reduce((s, r) => s + (parseFloat(r.visaIn) || 0), 0);
  const sumCashExp = filtered.reduce((s, r) => s + (parseFloat(r.cashExp) || 0), 0);
  const sumVisaExp = filtered.reduce((s, r) => s + (parseFloat(r.visaExp) || 0), 0);
  const turnover = sumCashIn + sumVisaIn;

  // --- FORM EXPENSE TOTALS ----------------------------------------------
  const sumCashExpForm = approvedExpenses
    .filter((e) => e.type === "cash")
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const sumVisaExpForm = approvedExpenses
    .filter((e) => e.type === "visa")
    .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  // Admin şifreyi elle belirleyip onaylayacak, hem ortak şifreyi hem talep kaydını güncelleyecek
  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`${format(parseISO(record.date), "dd/MM/yyyy")} tarihli kaydı silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      // Firebase'den sil
      await remove(ref(db, `cashRecords/${record.date}`));
      
      // Local state'i güncelle
      setAllRecords(prev => prev.filter(r => r.date !== record.date));
      
      setSuccessMessage(`${format(parseISO(record.date), "dd/MM/yyyy")} tarihli kayıt başarıyla silindi.`);
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Kayıt silinirken hata oluştu!");
    }
  };
    if (!selectedRequest || !newPassword) return;
    // Ortak şifreyi güncelle
    await set(ref(db, "cashEntryPassword"), newPassword);
    // Talep kaydını güncelle (status: approved, assignedPassword: newPassword)
    await set(ref(db, `cashPasswordRequests/${selectedRequest.uid || selectedRequest.email || Date.now()}`), {
      ...selectedRequest,
      status: "approved",
      assignedPassword: newPassword,
      approvedTime: Date.now()
    });
    setShowPasswordModal(false);
    setSelectedRequest(null);
    setNewPassword("");
    // Listeyi güncelle
    const snap = await get(ref(db, "cashPasswordRequests"));
    if (snap.exists()) {
      const reqs = Object.values(snap.val()).sort((a, b) => b.date - a.date);
      setPasswordRequests(reqs);
    } else {
      setPasswordRequests([]);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!window.confirm(`${format(parseISO(record.date), "dd/MM/yyyy")} tarihli kaydı silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      // Firebase'den sil
      await remove(ref(db, `cashRecords/${record.date}`));
      
      // Local state'i güncelle
      setAllRecords(prev => prev.filter(r => r.date !== record.date));
      
      setSuccessMessage(`${format(parseISO(record.date), "dd/MM/yyyy")} tarihli kayıt başarıyla silindi.`);
    } catch (error) {
      console.error("Silme hatası:", error);
      alert("Kayıt silinirken hata oluştu!");
    }
  };

  return (
    <Container className="my-4 p-4" style={softStyles.container}>
      {/* Kasa Defteri Ana İçerik */}
      {!showForm ? (
        <>
          {successMessage && (
            <Alert
              variant="success"
              dismissible
              style={{
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #d1edff 0%, #a8dadc 100%)',
                color: '#155724',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          )}
          <Row className="mb-4 align-items-center">
            <Col>
              <h4 style={{ 
                color: "#2c3e50",
                fontWeight: "600",
                fontSize: "24px",
                marginBottom: "8px",
                background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                💰 Kasa Defteri
              </h4>
              <p style={{ color: "#6c757d", fontSize: "14px", margin: 0 }}>
                Günlük gelir ve gider takibi
              </p>
            </Col>
            <Col xs="auto">
              <Button 
                variant="primary" 
                onClick={handleNew}
                style={{
                  ...softStyles.button,
                  ...softStyles.primaryButton,
                  padding: '10px 20px'
                }}
              >
                ➕ Yeni Kasa Ekle
              </Button>
            </Col>
          </Row>

          {/* Date filters */}
          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '20px'}}>
              <h6 style={{marginBottom: '16px', color: '#495057', fontWeight: '600'}}>
                📅 Tarih Filtreleri
              </h6>
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d'}}>
                    Başlangıç Tarihi
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={filterFrom}
                    style={softStyles.formControl}
                    onChange={(e) => {
                      setFilterFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d'}}>
                    Bitiş Tarihi
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={filterTo}
                    style={softStyles.formControl}
                    onChange={(e) => {
                      setFilterTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </Col>
                <Col xs={12} md={4}>
                  <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d'}}>
                    🔍 Ara (Not/Ciro)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Arama yapın..."
                    value={searchTerm}
                    style={softStyles.formControl}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Export & Chart */}
          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '20px'}}>
              <Row className="align-items-center">
                <Col>
                  <h6 style={{marginBottom: '8px', color: '#495057', fontWeight: '600'}}>
                    📊 Raporlar ve Analiz
                  </h6>
                  <p style={{fontSize: '13px', color: '#6c757d', margin: 0}}>
                    Verilerinizi dışa aktarın ve analiz edin
                  </p>
                </Col>
                <Col xs="auto">
                  <div className="d-flex gap-2 flex-wrap">
                    <CSVLink
                      data={filtered}
                      headers={[
                        { label: "Tarih", key: "date" },
                        { label: "Nakit", key: "cashIn" },
                        { label: "Visa", key: "visaIn" },
                        { label: "Nakit Masraf", key: "cashExp" },
                        { label: "Kart Masraf", key: "visaExp" },
                        { label: "Ciro", key: "totalSale" },
                        { label: "Not", key: "note" },
                      ]}
                      filename="kasa_defteri.csv"
                      className="btn"
                      style={{
                        ...softStyles.button,
                        background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                        color: 'white',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        fontSize: '13px'
                      }}
                    >
                      📄 CSV İndir
                    </CSVLink>
                    <Button
                      variant="outline-danger"
                      style={{
                        ...softStyles.button,
                        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        fontSize: '13px'
                      }}
                      onClick={() => {
                        const doc = new jsPDF();
                        doc.text("Kasa Defteri", 14, 20);
                        doc.autoTable({
                          startY: 30,
                          head: [["Tarih", "Nakit", "Visa", "Nakit Masraf", "Kart Masraf", "Ciro", "Not"]],
                          body: filtered.map((r) => [
                            format(parseISO(r.date), "dd/MM/yyyy"),
                            fmt(r.cashIn),
                            fmt(r.visaIn),
                            fmt(r.cashExp || 0),
                            fmt(r.visaExp || 0),
                            fmt(r.totalSale),
                            r.note,
                          ]),
                        });
                        doc.save("kasa_defteri.pdf");
                      }}
                    >
                      📋 PDF İndir
                    </Button>
                  </div>
                </Col>
              </Row>
              
              {/* Chart */}
              <div style={{marginTop: '20px'}}>
                <h6 style={{marginBottom: '16px', color: '#495057', fontWeight: '600'}}>
                  📈 Gelir Trendi
                </h6>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                    <XAxis dataKey="date" stroke="#6c757d" fontSize={12} />
                    <YAxis stroke="#6c757d" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ciro"
                      stroke="#007bff"
                      strokeWidth={3}
                      dot={{ fill: '#007bff', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#007bff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>

          {/* Summary Cards */}
          <Row className="g-3 mb-4">
            {[
              ["💰 Nakit", `₺${fmt(sumCashIn)}`, "#28a745"],
              ["💳 Visa", `₺${fmt(sumVisaIn)}`, "#007bff"],
              ["📤 Nakit Gider", `₺${fmt(sumCashExp)}`, "#dc3545"],
              ["📤 Visa Gider", `₺${fmt(sumVisaExp)}`, "#dc3545"],
              ["📊 Toplam Ciro", `₺${fmt(turnover)}`, "#6f42c1"],
            ].map(([title, value, color], i) => (
              <Col xs={6} sm={4} md key={i}>
                <Card 
                  className="h-100 text-center border-0"
                  style={{
                    ...softStyles.card,
                    background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                    borderLeft: `4px solid ${color}`
                  }}
                >
                  <Card.Body style={{padding: '16px'}}>
                    <div style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      {title}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: color,
                      marginBottom: '4px'
                    }}>
                      {value}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Paginated Table */}
          <Card style={{...softStyles.card, ...softStyles.table}} className="mb-4">
            <Card.Header style={{
              background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0',
              padding: '16px 20px',
              border: 'none'
            }}>
              <div className="d-flex align-items-center">
                <span style={{fontSize: '16px', fontWeight: '600'}}>
                  📋 Aylık Kasa Defteri
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '13px',
                  opacity: '0.9'
                }}>
                  {filtered.length} kayıt
                </span>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0" style={{borderRadius: '0 0 12px 12px'}}>
                <thead style={{
                  background: 'linear-gradient(135deg, #495057 0%, #6c757d 100%)',
                  color: 'white'
                }}>
                  <tr>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>📅 Tarih</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>💰 Nakit</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>💳 Visa</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>� Nakit Masraf</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>💳 Kart Masraf</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>📊 Ciro</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none'
                    }}>📝 Not</th>
                    <th style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none',
                      width: '100px'
                    }}>⚙️ İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r, index) => (
                    <tr key={r.date} style={{
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                      transition: 'all 0.2s ease',
                      borderBottom: index === pageData.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#495057',
                        border: 'none'
                      }}>
                        {format(parseISO(r.date), "dd/MM/yyyy")}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#28a745',
                        border: 'none'
                      }}>
                        ₺{fmt(r.cashIn)}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#007bff',
                        border: 'none'
                      }}>
                        ₺{fmt(r.visaIn)}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#dc3545',
                        border: 'none'
                      }}>
                        ₺{fmt(r.cashExp || 0)}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#fd7e14',
                        border: 'none'
                      }}>
                        ₺{fmt(r.visaExp || 0)}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#6f42c1',
                        border: 'none'
                      }}>
                        ₺{fmt(r.totalSale)}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        fontSize: '13px',
                        color: '#6c757d',
                        maxWidth: '200px',
                        wordBreak: 'break-word',
                        border: 'none'
                      }}>
                        {r.note}
                      </td>
                      <td style={{
                        padding: '12px 16px',
                        border: 'none'
                      }}>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          style={{
                            ...softStyles.button,
                            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                            color: 'white',
                            border: 'none',
                            fontSize: '11px',
                            padding: '4px 8px'
                          }}
                          onClick={() => handleDeleteRecord(r)}
                        >
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
            <Card.Footer style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '0 0 12px 12px',
              padding: '12px 20px',
              border: 'none',
              borderTop: '1px solid #dee2e6'
            }} className="d-flex justify-content-between align-items-center">
              <div style={{fontSize: '13px', color: '#6c757d'}}>
                Sayfa {currentPage} / {pageCount} • Toplam {filtered.length} kayıt
              </div>
              <div className="d-flex gap-2">
                <Button
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  style={{
                    ...softStyles.button,
                    background: currentPage === 1 ? '#e9ecef' : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    color: currentPage === 1 ? '#6c757d' : 'white',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px'
                  }}
                >
                  ← Önceki
                </Button>
                <Button
                  size="sm"
                  disabled={currentPage === pageCount}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{
                    ...softStyles.button,
                    background: currentPage === pageCount ? '#e9ecef' : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    color: currentPage === pageCount ? '#6c757d' : 'white',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '12px'
                  }}
                >
                  Sonraki →
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </>
      ) : (
        <>
          {prevSuccess && (
            <Alert
              variant="success"
              dismissible
              style={{
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                color: '#155724',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                marginBottom: '20px'
              }}
              onClose={() => setPrevSuccess("")}
            >
              ✅ {prevSuccess}
            </Alert>
          )}
          <Row className="mb-4 align-items-center">
            <Col xs={12} md={4}>
              <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d', marginBottom: '6px'}}>
                📅 Tarih Seçimi
              </Form.Label>
              <Form.Control
                type="date"
                value={entryDate}
                style={{
                  ...softStyles.formControl,
                  fontSize: '16px',
                  padding: '12px'
                }}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </Col>
            <Col xs={12} md={8} className="text-md-end mt-3 mt-md-0">
              <Button
                variant="outline-secondary"
                style={{
                  ...softStyles.button,
                  background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px'
                }}
                onClick={() => setShowForm(false)}
              >
                ← Vazgeç
              </Button>
            </Col>
          </Row>

          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '24px'}}>
              <h5 style={{
                ...softStyles.heading,
                marginBottom: '20px',
                fontSize: '18px',
                color: '#495057'
              }}>
                💰 Günlük Kasa Bilgileri
              </h5>
              
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRecord();
                }}
              >
                <Row className="g-4 mb-4">
                  <Col xs={12} sm={6} lg={4}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Form.Label style={{fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '8px'}}>
                        💵 Önceki Devir
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          value={prevValue}
                          onChange={(e) => setPrevValue(e.target.value)}
                          disabled={!allowPrev}
                          style={{
                            ...softStyles.formControl,
                            ...((!allowPrev) ? { background: "#e9ecef", color: '#6c757d' } : {}),
                            fontSize: "16px",
                            fontWeight: '600'
                          }}
                        />
                        <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          color: '#495057',
                          fontWeight: '600'
                        }}>₺</InputGroup.Text>
                        {!allowPrev && <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                          border: 'none',
                          color: 'white'
                        }}>🔒</InputGroup.Text>}
                      </InputGroup>
                      {allowPrev && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="mt-2 w-100"
                          style={{
                            ...softStyles.button,
                            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                            color: 'white',
                            border: 'none',
                            fontSize: '13px'
                          }}
                          onClick={savePrev}
                        >
                          ✅ Kaydet
                        </Button>
                      )}
                      {error && <div className="text-danger small mt-1">{error}</div>}
                    </div>
                  </Col>

                  <Col xs={12} sm={6} lg={4}>
                    <div style={{
                      background: 'linear-gradient(135deg, #d1edff 0%, #a8dadc 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Form.Label style={{fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '8px'}}>
                        💸 Nakit Satış
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          value={cashIn}
                          onChange={(e) => setCashIn(e.target.value)}
                          style={{
                            ...softStyles.formControl,
                            fontSize: "16px",
                            fontWeight: '600'
                          }}
                        />
                        <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '600'
                        }}>₺</InputGroup.Text>
                      </InputGroup>
                    </div>
                  </Col>

                  <Col xs={12} sm={6} lg={4}>
                    <div style={{
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Form.Label style={{fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '8px'}}>
                        💳 Visa Satış
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          value={visaIn}
                          onChange={(e) => setVisaIn(e.target.value)}
                          style={{
                            ...softStyles.formControl,
                            fontSize: "16px",
                            fontWeight: '600'
                          }}
                        />
                        <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #007bff 0%, #6f42c1 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '600'
                        }}>₺</InputGroup.Text>
                      </InputGroup>
                    </div>
                  </Col>
                </Row>

                <Row className="g-4 mb-4">
                  <Col xs={12} sm={6}>
                    <div style={{
                      background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Form.Label style={{fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '8px'}}>
                        💰 Toplam Ciro
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          readOnly
                          value={`₺${fmt(
                            (parseFloat(cashIn) || 0) + (parseFloat(visaIn) || 0)
                          )}`}
                          style={{
                            ...softStyles.formControl,
                            fontSize: "18px",
                            fontWeight: '700',
                            background: 'rgba(255,255,255,0.8)',
                            color: '#495057',
                            textAlign: 'center'
                          }}
                        />
                      </InputGroup>
                    </div>
                  </Col>

                  <Col xs={12} sm={6}>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <Form.Label style={{fontSize: '13px', fontWeight: '600', color: '#495057', marginBottom: '8px'}}>
                        📄 Adisyon Sayısı
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          value={adisyonCount}
                          onChange={(e) => setAdisyonCount(e.target.value)}
                          style={{
                            ...softStyles.formControl,
                            fontSize: "16px",
                            fontWeight: '600'
                          }}
                        />
                        <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '600'
                        }}>adet</InputGroup.Text>
                      </InputGroup>
                    </div>
                  </Col>
                </Row>

                <div className="d-grid">
                  <Button 
                    type="submit" 
                    style={{
                      ...softStyles.button,
                      ...softStyles.primaryButton,
                      padding: '16px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}
                  >
                    💾 Kaydet
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <h5 style={{
            ...softStyles.heading,
            marginBottom: '16px',
            fontSize: '20px',
            color: '#495057'
          }}>
            💸 Gider Detayları
          </h5>
          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '20px'}}>
              {pendingExpenses.map((e, i) => (
                <div
                  key={i}
                  className="mb-3 p-3 rounded-3"
                  style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div className="row g-3 align-items-center">
                    <div className="col-12 col-md-5">
                      <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d', marginBottom: '6px'}}>
                        Açıklama
                      </Form.Label>
                      <Form.Control
                        placeholder="Gider açıklaması..."
                        value={e.desc}
                        style={{
                          ...softStyles.formControl,
                          fontSize: '14px'
                        }}
                        onChange={(ev) => updPending(i, "desc", ev.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-2">
                      <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d', marginBottom: '6px'}}>
                        Tür
                      </Form.Label>
                      <Form.Select
                        value={e.type}
                        style={{
                          ...softStyles.formControl,
                          fontSize: '14px'
                        }}
                        onChange={(ev) => updPending(i, "type", ev.target.value)}
                      >
                        <option value="cash">💵 Nakit</option>
                        <option value="visa">💳 Kart</option>
                      </Form.Select>
                    </div>
                    <div className="col-6 col-md-3">
                      <Form.Label style={{fontSize: '13px', fontWeight: '500', color: '#6c757d', marginBottom: '6px'}}>
                        Tutar
                      </Form.Label>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          placeholder="0.00"
                          value={e.amount}
                          style={{
                            ...softStyles.formControl,
                            fontSize: '14px'
                          }}
                          onChange={(ev) => updPending(i, "amount", ev.target.value)}
                        />
                        <InputGroup.Text style={{
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          border: '1px solid rgba(0,0,0,0.1)',
                          color: '#6c757d',
                          fontSize: '14px'
                        }}>₺</InputGroup.Text>
                      </InputGroup>
                    </div>
                    <div className="col-12 col-md-2 d-grid">
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        style={{
                          ...softStyles.button,
                          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                          color: 'white',
                          border: 'none',
                          fontSize: '13px',
                          padding: '8px 12px'
                        }}
                        onClick={() => remPending(i)}
                      >
                        🗑️ Sil
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-between mt-3">
                <Button
                  variant="outline-primary"
                  style={{
                    ...softStyles.button,
                    background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                    color: 'white',
                    border: 'none',
                    flex: 1,
                    maxWidth: '200px'
                  }}
                  onClick={addExpense}
                >
                  ➕ Yeni Gider Ekle
                </Button>
                <Button
                  variant="success"
                  style={{
                    ...softStyles.button,
                    ...softStyles.primaryButton,
                    flex: 1,
                    maxWidth: '200px'
                  }}
                  onClick={approveExpenses}
                >
                  ✅ Giderleri Onayla
                </Button>
              </div>
            </Card.Body>
          </Card>

          <h5 style={{
            ...softStyles.heading,
            marginBottom: '16px',
            fontSize: '20px',
            color: '#495057'
          }}>
            ✅ Onaylanmış Giderler
          </h5>
          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '20px'}}>
              {approvedExpenses.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#6c757d',
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <div style={{fontSize: '2em', marginBottom: '12px'}}>📝</div>
                  <p style={{margin: 0, fontSize: '14px'}}>Henüz onaylanmış gider bulunmuyor.</p>
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <Table hover responsive className="mb-0" style={{fontSize: '14px'}}>
                    <thead style={{
                      background: 'linear-gradient(135deg, #495057 0%, #6c757d 100%)',
                      color: 'white'
                    }}>
                      <tr>
                        <th style={{border: 'none', padding: '12px 16px', fontWeight: '600'}}>Açıklama</th>
                        <th style={{border: 'none', padding: '12px 16px', fontWeight: '600'}}>Tür</th>
                        <th style={{border: 'none', padding: '12px 16px', fontWeight: '600'}}>Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedExpenses.map((e, i) => (
                        <tr key={i} style={{
                          borderBottom: i === approvedExpenses.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)'
                        }}>
                          <td style={{padding: '12px 16px', border: 'none', color: '#495057'}}>{e.desc}</td>
                          <td style={{padding: '12px 16px', border: 'none'}}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: e.type === "cash" ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #007bff 0%, #6f42c1 100%)',
                              color: 'white'
                            }}>
                              {e.type === "cash" ? "💵 Nakit" : "💳 Kart"}
                            </span>
                          </td>
                          <td style={{padding: '12px 16px', border: 'none'}}>
                            <span style={{
                              fontWeight: '600',
                              color: '#dc3545',
                              fontSize: '14px'
                            }}>
                              ₺{fmt(e.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          <Row className="g-3 mb-4">
            <Col xs={6} md={6}>
              <Card style={{
                ...softStyles.card,
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                textAlign: 'center'
              }}>
                <Card.Body style={{padding: '20px'}}>
                  <div style={{fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: '500'}}>
                    💵 Nakit Masraf Toplamı
                  </div>
                  <div style={{fontSize: '24px', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                    ₺{fmt(sumCashExpForm)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={6}>
              <Card style={{
                ...softStyles.card,
                background: 'linear-gradient(135deg, #007bff 0%, #6f42c1 100%)',
                color: 'white',
                textAlign: 'center'
              }}>
                <Card.Body style={{padding: '20px'}}>
                  <div style={{fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: '500'}}>
                    💳 Kart Masraf Toplamı
                  </div>
                  <div style={{fontSize: '24px', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                    ₺{fmt(sumVisaExpForm)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col xs={12} md={6}>
              <Card style={{
                ...softStyles.card,
                background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
                color: 'white',
                textAlign: 'center'
              }}>
                <Card.Body style={{padding: '20px'}}>
                  <div style={{fontSize: '13px', opacity: 0.9, marginBottom: '8px', fontWeight: '500'}}>
                    💰 Bugünkü Nakit Devir
                  </div>
                  <div style={{fontSize: '24px', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.2)'}}>
                    ₺{fmt(todayCashCarry)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h5 style={{
            ...softStyles.heading,
            marginBottom: '16px',
            fontSize: '20px',
            color: '#495057'
          }}>
            📝 Notlar
          </h5>
          <Card style={{...softStyles.card, marginBottom: '20px'}}>
            <Card.Body style={{padding: '20px'}}>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Günlük notlarınızı buraya ekleyebilirsiniz..."
                value={note}
                style={{
                  ...softStyles.formControl,
                  resize: 'vertical',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
                onChange={(e) => setNote(e.target.value)}
              />
            </Card.Body>
          </Card>

}

export default CashEntry;
