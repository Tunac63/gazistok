import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { ref, get, push } from "firebase/database";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup,
  Badge,
} from "react-bootstrap";
// ...importlar...

const UnifiedEntryPanel = () => {
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createdDate, setCreatedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [deliveredBy, setDeliveredBy] = useState("");
  const [description, setDescription] = useState("");
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [dateHasEntry, setDateHasEntry] = useState(false);
  const sentinelRef = useRef(null);
  const [stickFooter, setStickFooter] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, "products"));
        const data = snap.val() || {};
        setProducts(Object.entries(data).map(([id, v]) => ({ id, ...v })));
      } catch (err) {
        setMessage({ type: "danger", text: "Ürünler yüklenirken hata oluştu." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const io = new window.IntersectionObserver(
      ([entry]) => setStickFooter(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (sentinelRef.current) io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toplamSecilen = Object.values(quantities).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );

  const secilenUrunler = Object.entries(quantities)
    .filter(([, v]) => parseFloat(v) > 0)
    .map(([id, v]) => {
      const urun = products.find((p) => p.id === id);
      return urun ? { name: urun.name, adet: v } : null;
    })
    .filter(Boolean);

  const [showSecilenler, setShowSecilenler] = useState(false);

  const toplamTutar = products.reduce((sum, p) => {
    const adet = parseFloat(quantities[p.id] || 0);
    return sum + adet * (parseFloat(p.unitPrice) || 0);
  }, 0);

  const handleQuantityChange = (id, val) =>
    setQuantities((prev) => ({ ...prev, [id]: val }));

  const handleSaveAll = async () => {
    const secilen = Object.entries(quantities).filter(
      ([, v]) => parseFloat(v) > 0
    );
    if (secilen.length === 0) {
      setMessage({ type: "warning", text: "Hiçbir ürün seçilmedi." });
      setTimeout(() => { setMessage(null); }, 2000);
      return;
    }

    if (!deliveredBy.trim()) {
      setMessage({ type: "danger", text: "Teslim eden kişi girilmelidir!" });
      setTimeout(() => { setMessage(null); }, 2500);
      return;
    }

    const selectedDate = new Date(createdDate);
    const dateKey = selectedDate.toLocaleDateString("tr-TR").split(".").join("-");

    // Önce aynı tarihte kayıt var mı kontrol et
    setSaving(true);
    try {
      const snap = await get(ref(db, `dailyInvoices/${dateKey}`));
      if (snap.exists()) {
        setDateHasEntry(true);
        setShowDateConfirm(true);
        // Kayıt işlemini askıya al
        const productsToSave = secilen.map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          return {
            name: p.name,
            unitPrice: parseFloat(p.unitPrice),
            quantity: parseFloat(qty),
            category: p.category || "Diğer",
          };
        });
        const totalCost = productsToSave.reduce(
          (s, i) => s + i.unitPrice * i.quantity,
          0
        );
        setPendingEntry({
          entry: {
            date: selectedDate.toISOString(),
            products: productsToSave,
            totalCost,
            deliveredBy,
            description,
          },
          productsToSave,
          dateKey,
          selectedDate
        });
        setSaving(false);
        return;
      }
      // Eğer yoksa doğrudan kaydet
      await saveEntry(secilen, selectedDate, dateKey);
    } catch (err) {
      setMessage({ type: "danger", text: "Kayıt kontrolünde hata oluştu." });
      setTimeout(() => { setMessage(null); }, 2000);
    } finally {
      setSaving(false);
    }
  };

  // Asıl kayıt işlemi (onaydan sonra da burası çağrılır)
  const saveEntry = async (secilen, selectedDate, dateKey) => {
    const productsToSave = secilen.map(([id, qty]) => {
      const p = products.find((x) => x.id === id);
      return {
        name: p.name,
        unitPrice: parseFloat(p.unitPrice),
        quantity: parseFloat(qty),
        category: p.category || "Diğer",
      };
    });
    const totalCost = productsToSave.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0
    );
    const entry = {
      date: selectedDate.toISOString(),
      products: productsToSave,
      totalCost,
      deliveredBy,
      description,
    };
    try {
      await push(ref(db, "entries"), entry);
      for (const item of productsToSave) {
        await push(ref(db, `dailyInvoices/${dateKey}`), {
          productName: item.name,
          ...item,
          totalCost: item.unitPrice * item.quantity,
          date: selectedDate.toISOString(),
          deliveredBy,
          description,
          approved: false,
        });
      }
      setQuantities({});
      setMessage({ type: "success", text: "İrsaliye kaydı başarılı! Teşekkürler." });
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (err) {
      setMessage({ type: "danger", text: "Kayıt sırasında hata oluştu." });
      setTimeout(() => { window.location.reload(); }, 1200);
    }
  };

  if (loading)
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" style={{ color: '#23263a' }} />
        <p className="mt-2" style={{ color: '#23263a', fontWeight: 600 }}>Ürünler yükleniyor...</p>
      </Container>
    );

  return (
    <>
      <style>{`
        html, body {
          background: linear-gradient(120deg, #fdf6ee 0%, #f9e7d3 100%),
            radial-gradient(ellipse at 80% 10%, #ffe5b4 0%, transparent 70%),
            radial-gradient(ellipse at 20% 80%, #ffd6a5 0%, transparent 70%),
            radial-gradient(ellipse at 60% 60%, #fff7ed 0%, transparent 80%);
          background-blend-mode: overlay, lighten, lighten, lighten;
          min-height: 100vh;
          width: 100vw;
          box-sizing: border-box;
          overscroll-behavior: none;
        }
        /* Mobilde mavi tap highlight'ı kaldır */
        * {
          -webkit-tap-highlight-color: transparent !important;
        }
        input, textarea, select, button {
          background: inherit !important;
          box-shadow: none !important;
          outline: none !important;
        }
        @media (max-width: 576px) {
          .uep-mob-px { padding-left: 6px !important; padding-right: 6px !important; }
          .uep-mob-py { padding-top: 10px !important; padding-bottom: 10px !important; }
          .uep-mob-card { padding: 0.7rem 0.2rem !important; min-height: 120px !important; max-width: 99vw !important; }
          .uep-mob-title { font-size: 15px !important; }
          .uep-mob-badge { font-size: 11px !important; padding: 2px 7px !important; }
          .uep-mob-btn { font-size: 13px !important; padding: 0.38rem 0 !important; max-width: 99vw !important; }
          .uep-mob-footer { padding: 0.5rem 2px 0.4rem 2px !important; border-radius: 0 !important; }
          .uep-mob-secilen { font-size: 12px !important; padding: 5px 7px !important; }
          .uep-mob-main {
            max-width: 99vw !important;
            padding-left: 6px !important;
            padding-right: 6px !important;
          }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(120deg, #fdf6ee 0%, #f9e7d3 100%),
          radial-gradient(ellipse at 80% 10%, #ffe5b4 0%, transparent 70%),
          radial-gradient(ellipse at 20% 80%, #ffd6a5 0%, transparent 70%),
          radial-gradient(ellipse at 60% 60%, #fff7ed 0%, transparent 80%)`,
        backgroundBlendMode: 'overlay, lighten, lighten, lighten',
        padding: 0,
        margin: 0,
        width: '100%',
        fontFamily: 'Montserrat, Inter, Segoe UI, Arial, sans-serif',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}>
        <div className="uep-mob-main" style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '18px 12px 0 12px',
          width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, justifyContent: 'center' }}>
            <span style={{
              fontSize: 32,
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffe5b4 100%)',
              borderRadius: 18,
              padding: '8px 16px',
              color: '#5a4a2f',
              boxShadow: '0 4px 24px 0 #ffd6a577',
              marginRight: 8,
              maxWidth: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffe5b4',
              filter: 'blur(0.2px) saturate(1.1)',
            }}>📦</span>
            <h2 style={{
              fontWeight: 900,
              color: '#5a4a2f',
              fontSize: 27,
              letterSpacing: 0.7,
              margin: 0,
              textShadow: '0 2px 18px #ffd6a599, 0 1px 8px #ffe5b444'
            }}>Toplu Ürün Girişi</h2>
          </div>
          {/* Üstteki uyarı kaldırıldı, sadece sticky footer üstünde gösterilecek */}
          {showDateConfirm && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
              <Alert variant="warning" style={{
                borderRadius: 18,
                fontWeight: 800,
                fontSize: 17,
                background: '#fef9c3',
                border: '2px solid #facc15',
                color: '#b45309',
                boxShadow: '0 2px 16px 0 rgba(250,204,21,0.10)',
                letterSpacing: 0.09,
                minWidth: 260,
                textAlign: 'center',
                margin: 0
              }}>
                Bu tarihte irsaliye mevcut. Üstüne eklemek istiyor musunuz?
              </Alert>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <Button variant="success" style={{ fontWeight: 700, minWidth: 80 }} onClick={async () => {
                  setShowDateConfirm(false);
                  if (pendingEntry) {
                    await saveEntry(
                      Object.entries(quantities).filter(([, v]) => parseFloat(v) > 0),
                      new Date(createdDate),
                      pendingEntry.dateKey
                    );
                    setPendingEntry(null);
                  }
                }}>Evet</Button>
                <Button variant="outline-danger" style={{ fontWeight: 700, minWidth: 80 }} onClick={() => {
                  setShowDateConfirm(false);
                  setPendingEntry(null);
                  setMessage({ type: "info", text: "Kayıt iptal edildi." });
                  setTimeout(() => { setMessage(null); }, 2000);
                }}>Hayır</Button>
              </div>
            </div>
          )}
          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: 900, color: '#3d2c13', fontSize: 17, letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase', textShadow: '0 1px 6px #fff7ed' }}>Oluşturulma Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              style={{ borderRadius: 18, border: '1.5px solid #ffe5b4', fontWeight: 700, fontSize: 16, background: '#fffdf8', color: '#3d2c13', boxShadow: '0 2px 12px 0 #ffe5b422', transition: 'border 0.18s', outline: 'none', padding: '0.7rem 1.1rem' }}
              onFocus={e => e.target.style.border = '1.5px solid #ffe5b4'}
              onBlur={e => e.target.style.border = '1.5px solid #ffd6a5'}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: 900, color: '#3d2c13', fontSize: 17, letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase', textShadow: '0 1px 6px #fff7ed' }}>Teslim Eden Kişi</Form.Label>
            <Form.Control
              type="text"
              placeholder="Teslim eden kişi adı"
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              style={{ borderRadius: 18, border: '1.5px solid #ffe5b4', fontWeight: 700, fontSize: 16, background: '#fffdf8', color: '#3d2c13', boxShadow: '0 2px 12px 0 #ffe5b422', transition: 'border 0.18s', outline: 'none', padding: '0.7rem 1.1rem' }}
              onFocus={e => e.target.style.border = '1.5px solid #ffe5b4'}
              onBlur={e => e.target.style.border = '1.5px solid #ffd6a5'}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: 900, color: '#3d2c13', fontSize: 17, letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase', textShadow: '0 1px 6px #fff7ed' }}>Açıklama</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="İrsaliye açıklaması..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ borderRadius: 18, border: '1.5px solid #ffe5b4', fontWeight: 700, fontSize: 16, background: '#fffdf8', color: '#3d2c13', boxShadow: '0 2px 12px 0 #ffe5b422', transition: 'border 0.18s', outline: 'none', padding: '0.7rem 1.1rem' }}
              onFocus={e => e.target.style.border = '1.5px solid #ffe5b4'}
              onBlur={e => e.target.style.border = '1.5px solid #ffd6a5'}
            />
          </Form.Group>
          <Form.Control
            className="mb-4"
            placeholder="🔍 Ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 18, border: '1.5px solid #ffd6a5', fontWeight: 700, fontSize: 16, background: '#fff7ed', color: '#5a4a2f', boxShadow: '0 2px 12px 0 #ffd6a522', transition: 'border 0.18s', outline: 'none', padding: '0.7rem 1.1rem' }}
            onFocus={e => e.target.style.border = '1.5px solid #ffe5b4'}
            onBlur={e => e.target.style.border = '1.5px solid #ffd6a5'}
          />
        </div>
        <Row
          className="g-4 justify-content-center"
          style={{
            rowGap: 28,
            columnGap: 0,
            width: '100%',
            margin: 0,
          }}
        >
          {filteredProducts.map((p) => {
            const q = quantities[p.id] || "";
            const toplam = parseFloat(p.unitPrice) * (parseFloat(q) || 0);
            return (
              <Col
                xs={12}
                sm={6}
                md={4}
                lg={3}
                key={p.id}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <Card
                  className="h-100 border-0 w-100"
                  style={{
                    borderRadius: 26,
                    background: 'rgba(255,247,237,0.92)',
                    boxShadow: '0 8px 32px 0 #ffd6a555, 0 2px 12px 0 #ffe5b422',
                    border: '2px solid #ffe5b4',
                    padding: '1.1rem 0.7rem',
                    minHeight: 180,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'box-shadow 0.22s, border 0.22s',
                    width: '100%',
                    maxWidth: 340,
                    backdropFilter: 'blur(8px) saturate(1.2)',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.boxShadow = '0 16px 48px 0 #ffd6a5cc, 0 2px 12px 0 #ffe5b4cc';
                    e.currentTarget.style.border = '2.5px solid #ffd6a5';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.boxShadow = '0 8px 32px 0 #ffd6a555, 0 2px 12px 0 #ffe5b422';
                    e.currentTarget.style.border = '2px solid #ffe5b4';
                  }}
                >
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <Card.Title className="fs-6 text-truncate uep-mob-title" style={{ fontWeight: 900, color: '#3d2c13', fontSize: 18, letterSpacing: 0.10 }}>{p.name}</Card.Title>
                      <Card.Text className="small mb-3" style={{ color: '#3d2c13', fontWeight: 700, fontSize: 15 }}>
                        ₺{parseFloat(p.unitPrice).toFixed(2)} — <Badge bg="light" text="dark" className="uep-mob-badge" style={{ border: '1.5px solid #ffe5b4', fontWeight: 800, fontSize: 13, borderRadius: 9, padding: '2px 11px', background: '#fffdf8', color: '#3d2c13', letterSpacing: 0.06, boxShadow: '0 1px 6px #ffe5b422' }}>{p.category || "Diğer"}</Badge>
                      </Card.Text>
                    </div>
                    <InputGroup size="sm">
                      <Form.Control
                        type="number"
                        min="0"
                        value={q}
                        placeholder="Adet"
                        onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                        style={{ borderRadius: 12, border: '2px solid #ffd6a5', fontWeight: 800, fontSize: 16, background: 'rgba(255,247,237,0.97)', color: '#5a4a2f', boxShadow: '0 1px 6px #ffd6a522', transition: 'border 0.18s', outline: 'none', padding: '0.55rem 0.8rem', backdropFilter: 'blur(2px)' }}
                        onFocus={e => e.target.style.border = '2px solid #ffe5b4'}
                        onBlur={e => e.target.style.border = '2px solid #ffd6a5'}
                      />
                      <InputGroup.Text style={{ background: 'linear-gradient(90deg, #fff7ed 0%, #ffd6a5 100%)', fontWeight: 800, color: '#5a4a2f', border: '1.5px solid #ffd6a5', fontSize: 15, borderRadius: 12, boxShadow: '0 1px 6px #ffd6a522' }}>₺{toplam.toFixed(2)}</InputGroup.Text>
                    </InputGroup>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
        <div ref={sentinelRef} style={{ height: 120 }} />
        {message && (
          <div
            style={{
              position: 'fixed',
              top: 18,
              right: 0,
              left: 0,
              display: 'flex',
              justifyContent: 'center',
              zIndex: 3000,
              pointerEvents: 'none',
            }}
          >
            <Alert
              variant={message.type}
              style={{
                borderRadius: 18,
                fontWeight: 800,
                fontSize: 17,
                background: message.type === 'success'
                  ? 'linear-gradient(90deg, #fff7ed 0%, #ffd6a5 100%)'
                  : 'linear-gradient(90deg, #fdf6ee 0%, #f9e7d3 100%)',
                border: '2.5px solid #ffd6a5',
                color: '#5a4a2f',
                boxShadow: '0 8px 32px 0 #ffd6a555',
                letterSpacing: 0.09,
                minWidth: 180,
                textAlign: 'center',
                margin: 0,
                padding: '14px 26px',
                maxWidth: 420,
                pointerEvents: 'auto',
                backdropFilter: 'blur(4px) saturate(1.1)',
              }}
            >
              {message.text}
            </Alert>
          </div>
        )}
        <div
          className={stickFooter ? 'uep-mob-footer' : 'uep-mob-footer'}
          style={{
            position: stickFooter ? "fixed" : "static",
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(255,247,237,0.97)',
            backdropFilter: stickFooter ? 'blur(14px) saturate(1.2)' : 'none',
            WebkitBackdropFilter: stickFooter ? 'blur(14px) saturate(1.2)' : 'none',
            padding: stickFooter ? '0.7rem min(2vw,16px) 0.6rem min(2vw,16px)' : '0.7rem 0 0.6rem 0',
            borderTop: '2px solid #ffd6a5',
            boxShadow: stickFooter ? '0 -8px 32px 0 #ffd6a555' : 'none',
            zIndex: 1020,
            borderRadius: stickFooter ? '18px 18px 0 0' : '0',
            maxWidth: '1600px',
            margin: stickFooter ? '0 auto' : '0',
            left: stickFooter ? '50%' : '0',
            transform: stickFooter ? 'translateX(-50%)' : 'none',
            width: '100%',
            transition: 'all 0.22s',
            boxSizing: 'border-box',
            overflowX: 'hidden',
          }}
        >
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-1 gap-2 gap-md-0" style={{ minHeight: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 15, color: '#5a4a2f', letterSpacing: 0.08, background: 'linear-gradient(90deg, #ffd6a5 0%, #ffe5b4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Toplam Seçilen: <span style={{ color: '#5a4a2f', fontWeight: 900, background: 'none', WebkitTextFillColor: 'unset' }}>{toplamSecilen}</span> adet
              </span>
              {secilenUrunler.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSecilenler((v) => !v)}
                  style={{
                    background: 'linear-gradient(90deg, #fff7ed 0%, #ffd6a5 100%)',
                    border: '1.5px solid #ffd6a5',
                    borderRadius: 8,
                    padding: '2px 12px',
                    fontSize: 13,
                    color: '#5a4a2f',
                    fontWeight: 700,
                    marginLeft: 6,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background 0.18s',
                    boxShadow: '0 1px 6px #ffd6a533',
                  }}
                >
                  {showSecilenler ? 'Seçilenleri Gizle' : 'Seçilenleri Gör'}
                </button>
              )}
            </div>
            <span style={{ fontWeight: 900, fontSize: 17, color: '#5a4a2f', letterSpacing: 0.12, background: 'linear-gradient(90deg, #ffd6a5 0%, #ffe5b4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{`₺${toplamTutar.toFixed(2)}`}</span>
          </div>
          {showSecilenler && secilenUrunler.length > 0 && (
            <div className="uep-mob-secilen" style={{
              background: 'rgba(255,247,237,0.97)',
              border: '2px solid #ffd6a5',
              borderRadius: 12,
              padding: '7px 14px',
              fontSize: 14,
              color: '#5a4a2f',
              fontWeight: 700,
              margin: '7px 0 2px 0',
              maxHeight: 120,
              overflowY: 'auto',
              boxShadow: '0 2px 12px 0 #ffd6a522',
              backdropFilter: 'blur(4px)',
            }}>
              {secilenUrunler.map((u) => (
                <div key={u.name} style={{ borderBottom: '1px solid #ffd6a522', padding: '2px 0', fontSize: 14 }}>
                  {u.name} <span style={{ color: '#5a4a2f' }}>x{u.adet}</span>
                </div>
              ))}
            </div>
          )}
          <Button
            className="w-100 uep-mob-btn"
            variant="primary"
            style={{
              fontWeight: 800,
              borderRadius: 14,
              background: 'linear-gradient(90deg, #fff7ed 0%, #ffd6a5 100%)',
              color: '#5a4a2f',
              border: '2.5px solid #ffd6a5',
              fontSize: 15,
              boxShadow: '0 4px 18px 0 #ffd6a555',
              letterSpacing: 0.12,
              transition: 'background 0.22s, color 0.22s, border 0.22s',
              marginTop: 6,
              padding: '0.54rem 0',
              width: '100%',
              maxWidth: 340,
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'block',
              backdropFilter: 'blur(2px)',
            }}
            disabled={saving}
            onClick={handleSaveAll}
            onMouseOver={e => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #ffd6a5 0%, #fff7ed 100%)';
              e.currentTarget.style.border = '2.5px solid #ffe5b4';
              e.currentTarget.style.boxShadow = '0 8px 32px 0 #ffd6a5cc';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'linear-gradient(90deg, #fff7ed 0%, #ffd6a5 100%)';
              e.currentTarget.style.border = '2.5px solid #ffd6a5';
              e.currentTarget.style.boxShadow = '0 4px 18px 0 #ffd6a555';
            }}
          >
            {saving ? "Kaydediliyor..." : "Tümünü Kaydet ve Gönder"}
          </Button>
        </div>
      </div>
    </>
  );
};
export default UnifiedEntryPanel;
