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
import { ref, get, set } from "firebase/database";
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
  const [todayVisaCarry, setTodayVisaCarry] = useState(0);
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
    const vi = parseFloat(visaIn) || 0;
    const cExp = approvedExpenses
      .filter((e) => e.type === "cash")
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const vExp = approvedExpenses
      .filter((e) => e.type === "visa")
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    setTodayCashCarry(prevCarry + ci - cExp);
    setTodayVisaCarry(vi - vExp);
  }, [prevCarry, cashIn, visaIn, approvedExpenses]);

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
      todayVisaCarry,
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
  const handleAssignPassword = async () => {
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

  return (
    <Container className="my-4 bg-light p-4 rounded">
      {/* Kasa Defteri Ana İçerik */}
      {!showForm ? (
        <>
          {successMessage && (
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
            >
              {successMessage}
            </Alert>
          )}
          <Row className="mb-3 align-items-center">
            <Col>
              <h4 style={{ color: "#155724" }}>Gelişmiş Kasa Özeti</h4>
            </Col>
            <Col xs="auto">
              <Button {...hoverGreen} variant="success" onClick={handleNew}>
                Yeni Kasa Ekle
              </Button>
            </Col>
          </Row>

          {/* Date filters */}
          <Row className="g-3 mb-3">
            <Col xs={12} md={4}>
              <Form.Label>Başlangıç Tarihi</Form.Label>
              <Form.Control
                type="date"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label>Bitiş Tarihi</Form.Label>
              <Form.Control
                type="date"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Label>Ara (Not/Ciro)</Form.Label>
              <Form.Control
                placeholder="Ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </Col>
          </Row>

          {/* Export & Chart */}
          <Row className="mb-4">
            <Col xs="auto">
              <CSVLink
                data={filtered}
                headers={[
                  { label: "Tarih", key: "date" },
                  { label: "Nakit", key: "cashIn" },
                  { label: "Visa", key: "visaIn" },
                  { label: "Ciro", key: "totalSale" },
                  { label: "Not", key: "note" },
                ]}
                filename="kasa_defteri.csv"
                className="btn btn-outline-primary me-2"
              >
                CSV İndir
              </CSVLink>
              <Button
                variant="outline-danger"
                onClick={() => {
                  const doc = new jsPDF();
                  doc.text("Kasa Defteri", 14, 20);
                  doc.autoTable({
                    startY: 30,
                    head: [["Tarih", "Nakit", "Visa", "Ciro", "Not"]],
                    body: filtered.map((r) => [
                      format(parseISO(r.date), "dd/MM/yyyy"),
                      fmt(r.cashIn),
                      fmt(r.visaIn),
                      fmt(r.totalSale),
                      r.note,
                    ]),
                  });
                  doc.save("kasa_defteri.pdf");
                }}
              >
                PDF İndir
              </Button>
            </Col>
            <Col>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="ciro"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Col>
          </Row>

          {/* Summary Cards */}
          <Row className="g-2 mb-4">
            {[
              ["Nakit", `₺${fmt(sumCashIn)}`],
              ["Visa", `₺${fmt(sumVisaIn)}`],
              ["Nakit Gider", `₺${fmt(sumCashExp)}`],
              ["Visa Gider", `₺${fmt(sumVisaExp)}`],
              ["Toplam Ciro", `₺${fmt(turnover)}`],
            ].map(([t, v], i) => (
              <Col xs={6} sm={4} md={2} key={i} className="mb-2">
                <Card border="primary" className="h-100 text-center">
                  <Card.Body className="py-2">
                    <div className="small text-secondary">{t}</div>
                    <div className="h5">{v}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Paginated Table */}
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
              Aylık Kasa Defteri
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tarih</th>
                    <th>Nakit</th>
                    <th>Visa</th>
                    <th>Ciro</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r) => (
                    <tr key={r.date}>
                      <td>{format(parseISO(r.date), "dd/MM/yyyy")}</td>
                      <td>₺{fmt(r.cashIn)}</td>
                      <td>₺{fmt(r.visaIn)}</td>
                      <td>₺{fmt(r.totalSale)}</td>
                      <td>{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
            <Card.Footer className="d-flex justify-content-between align-items-center">
              <div>
                Sayfa {currentPage} / {pageCount}
              </div>
              <div>
                <Button
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="me-2"
                >
                  Önceki
                </Button>
                <Button
                  size="sm"
                  disabled={currentPage === pageCount}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </>
      ) : (
        <>
          {prevSuccess && (
            <Alert
              variant="info"
              dismissible
              onClose={() => setPrevSuccess("")}
            >
              {prevSuccess}
            </Alert>
          )}
          <Row className="mb-3 align-items-center">
            <Col xs={12} md={4}>
              <Form.Control
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </Col>
            <Col xs={12} md={8} className="text-md-end mt-2 mt-md-0">
              <Button
                variant="outline-secondary"
                onClick={() => setShowForm(false)}
              >
                Vazgeç
              </Button>
            </Col>
          </Row>

          <Form
            onSubmit={(e) => {
              e.preventDefault();
              saveRecord();
            }}
          >
            <Row className="g-2 align-items-end mb-3">
              <Col xs={12} sm={6} md={2}>
                <Form.Label>Önceki Devir</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={prevValue}
                    onChange={(e) => setPrevValue(e.target.value)}
                    disabled={!allowPrev}
                    style={!allowPrev ? { background: "#e9ecef" } : {}}
                  />
                  <InputGroup.Text>₺</InputGroup.Text>
                  {!allowPrev && <InputGroup.Text>🔒</InputGroup.Text>}
                </InputGroup>
                {allowPrev && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="mt-1 w-100"
                    onClick={savePrev}
                    {...hoverGreen}
                  >
                    Kaydet
                  </Button>
                )}
                {error && <div className="text-danger small">{error}</div>}
              </Col>

              <Col xs={12} sm={6} md={2}>
                <Form.Label>Nakit Satış</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={cashIn}
                    onChange={(e) => setCashIn(e.target.value)}
                  />
                  <InputGroup.Text>₺</InputGroup.Text>
                </InputGroup>
              </Col>

              <Col xs={12} sm={6} md={2}>
                <Form.Label>Visa Satış</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={visaIn}
                    onChange={(e) => setVisaIn(e.target.value)}
                  />
                  <InputGroup.Text>₺</InputGroup.Text>
                </InputGroup>
              </Col>

              <Col xs={12} sm={6} md={2}>
                <Form.Label>Toplam Ciro</Form.Label>
                <InputGroup>
                  <Form.Control
                    readOnly
                    value={`₺${fmt(
                      (parseFloat(cashIn) || 0) + (parseFloat(visaIn) || 0)
                    )}`}
                  />
                </InputGroup>
              </Col>

              <Col xs={12} sm={6} md={2}>
                <Form.Label>Adisyon</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    value={adisyonCount}
                    onChange={(e) => setAdisyonCount(e.target.value)}
                  />
                </InputGroup>
              </Col>

              <Col xs={12} sm={6} md={2} className="d-grid">
                <Button type="submit" variant="dark" {...hoverGreen}>
                  Kaydet
                </Button>
              </Col>
            </Row>
          </Form>

          <h5>Gider Detayları</h5>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              {pendingExpenses.map((e, i) => (
                <div
                  key={i}
                  className="mb-2 row gx-2 gy-2 align-items-stretch"
                  style={{ flexWrap: 'wrap' }}
                >
                  <div className="col-12 col-md">
                    <Form.Control
                      placeholder="Açıklama"
                      value={e.desc}
                      onChange={(ev) => updPending(i, "desc", ev.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-auto">
                    <Form.Select
                      value={e.type}
                      onChange={(ev) => updPending(i, "type", ev.target.value)}
                    >
                      <option value="cash">Nakit</option>
                      <option value="visa">Kart</option>
                    </Form.Select>
                  </div>
                  <div className="col-6 col-md-auto">
                    <Form.Control
                      type="number"
                      placeholder="Tutar"
                      value={e.amount}
                      onChange={(ev) => updPending(i, "amount", ev.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-auto d-grid">
                    <Button variant="outline-danger" onClick={() => remPending(i)}>
                      Sil
                    </Button>
                  </div>
                </div>
              ))}
              <div className="d-flex flex-column flex-md-row gap-2 justify-content-between mt-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={addExpense}
                  {...hoverGreen}
                  className="w-100 w-md-auto"
                >
                  + Gider Ekle
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={approveExpenses}
                  {...hoverGreen}
                  className="w-100 w-md-auto"
                >
                  Giderleri Onayla
                </Button>
              </div>
            </Card.Body>
          </Card>

          <h5>Onaylanmış Giderler</h5>
          <Card className="mb-3">
            <Card.Body>
              {approvedExpenses.length === 0 ? (
                <div className="text-muted">Henüz gider yok.</div>
              ) : (
                <Table size="sm" responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>Açıklama</th>
                      <th>Tür</th>
                      <th>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedExpenses.map((e, i) => (
                      <tr key={i}>
                        <td>{e.desc}</td>
                        <td>{e.type === "cash" ? "Nakit" : "Kart"}</td>
                        <td>₺{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          <Row className="g-3 mb-4">
            <Col xs={6} md={6}>
              <Card className="text-center p-2 mb-2">
                <Card.Body className="p-2">
                  <div className="small text-muted">Nakit Masraf Toplamı</div>
                  <div className="h6">₺{fmt(sumCashExpForm)}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={6}>
              <Card className="text-center p-2 mb-2">
                <Card.Body className="p-2">
                  <div className="small text-muted">Kart Masraf Toplamı</div>
                  <div className="h6">₺{fmt(sumVisaExpForm)}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <h5>Not</h5>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Not ekleyin..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}
