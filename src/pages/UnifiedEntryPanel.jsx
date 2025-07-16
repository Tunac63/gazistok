// UnifiedEntryPanel.jsx (kontrol edilmiş, iyileştirmeler dahil edilmiştir)
// Eksik veya geliştirilebilir kısımlar aşağıda güncellenmiştir:
// - adminApproved alanı kaldırıldı çünkü kullanılmıyor
// - totalCost her üründe zaten kayıt ediliyor, tekrar hesaplanıyor
// - alert yerine setMessage ile daha tutarlı uyarı yapısı sağlandı
// - ufak hata kontrolleri eklendi (örneğin boş ürün adı olabilir kontrolü)

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
  Modal,
} from "react-bootstrap";
import { format } from "date-fns";

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
  const sentinelRef = useRef(null);
  const [stickFooter, setStickFooter] = useState(true);
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, "products"));
        const data = snap.val() || {};
        setProducts(Object.entries(data).map(([id, v]) => ({ id, ...v })));
      } catch (err) {
        console.error("Ürün verileri alınamadı:", err);
        setMessage({ type: "danger", text: "Ürünler yüklenirken hata oluştu." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
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
    if (secilen.length === 0)
      return setMessage({ type: "warning", text: "Hiçbir ürün seçilmedi." });

    if (!deliveredBy.trim())
      return setMessage({ type: "warning", text: "Teslim eden kişi girilmelidir." });

    const selectedDate = new Date(createdDate);
    const dateKey = format(selectedDate, "dd-MM-yyyy");

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

    setSaving(true);
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
      setMessage({ type: "success", text: `✔ ${productsToSave.length} ürün başarıyla kaydedildi.` });
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setMessage({ type: "danger", text: "Kayıt sırasında hata oluştu." });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p className="mt-2">Ürünler yükleniyor...</p>
      </Container>
    );

  return (
    <Container className="py-3" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {message && <Alert variant={message.type} style={{ 
        backgroundColor: message.type === 'success' ? '#d1e7dd' : '#f8d7da',
        borderColor: message.type === 'success' ? '#badbcc' : '#f5c2c7',
        color: message.type === 'success' ? '#0f5132' : '#842029'
      }}>{message.text}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label style={{ color: '#495057', fontWeight: '500' }}>Oluşturulma Tarihi</Form.Label>
        <Form.Control
          type="date"
          value={createdDate}
          onChange={(e) => setCreatedDate(e.target.value)}
          style={{ 
            backgroundColor: '#ffffff',
            borderColor: '#ced4da',
            color: '#495057'
          }}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label style={{ color: '#495057', fontWeight: '500' }}>Teslim Eden Kişi</Form.Label>
        <Form.Control
          type="text"
          placeholder="Teslim eden kişi adı"
          value={deliveredBy}
          onChange={(e) => setDeliveredBy(e.target.value)}
          style={{ 
            backgroundColor: '#ffffff',
            borderColor: '#ced4da',
            color: '#495057'
          }}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label style={{ color: '#495057', fontWeight: '500' }}>Açıklama</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          placeholder="İrsaliye açıklaması..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ 
            backgroundColor: '#ffffff',
            borderColor: '#ced4da',
            color: '#495057'
          }}
        />
      </Form.Group>

      <Form.Control
        className="mb-3"
        placeholder="🔍 Ürün ara..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ 
          backgroundColor: '#ffffff',
          borderColor: '#dee2e6',
          color: '#495057',
          fontSize: '16px'
        }}
      />

      <Row className="g-3">
        {filteredProducts.map((p) => {
          const q = quantities[p.id] || "";
          const toplam = parseFloat(p.unitPrice) * (parseFloat(q) || 0);
          return (
            <Col xs={12} sm={6} md={4} key={p.id}>
              <Card className="h-100 shadow-sm border-0" style={{ 
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <Card.Body className="d-flex flex-column justify-content-between" style={{ padding: '1.25rem' }}>
                  <div>
                    <Card.Title className="fs-6 text-truncate" style={{ 
                      color: '#343a40',
                      fontWeight: '600',
                      marginBottom: '0.75rem'
                    }}>{p.name}</Card.Title>
                    <Card.Text className="small text-muted mb-3" style={{ color: '#6c757d' }}>
                      ₺{parseFloat(p.unitPrice).toFixed(2)} — <Badge bg="light" text="dark" style={{ 
                        backgroundColor: '#e9ecef',
                        color: '#495057',
                        border: '1px solid #dee2e6'
                      }}>{p.category || "Diğer"}</Badge>
                    </Card.Text>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'stretch',
                      height: '56px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.1"
                          value={q}
                          placeholder="Adet girin..."
                          onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                          style={{ 
                            backgroundColor: '#ffffff',
                            borderColor: q ? '#28a745' : '#ced4da',
                            color: '#343a40',
                            fontSize: '18px',
                            fontWeight: '500',
                            padding: '16px 20px',
                            height: '56px',
                            borderRadius: '12px',
                            border: `2px solid ${q ? '#28a745' : '#e9ecef'}`,
                            boxShadow: q ? '0 0 0 0.2rem rgba(40, 167, 69, 0.25)' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      </div>
                      <div style={{
                        backgroundColor: toplam > 0 ? '#28a745' : '#e9ecef',
                        color: toplam > 0 ? '#ffffff' : '#6c757d',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '100px',
                        fontWeight: '700',
                        fontSize: '16px',
                        border: 'none',
                        transition: 'all 0.3s ease'
                      }}>
                        ₺{toplam.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div ref={sentinelRef} style={{ height: 120 }} />

      <div
        style={{
          position: stickFooter ? "fixed" : "static",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          padding: "1.25rem",
          borderTop: "1px solid #e9ecef",
          boxShadow: stickFooter ? "0 -4px 20px rgba(0,0,0,0.08)" : "none",
          zIndex: 1020,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small 
            className="text-muted" 
            style={{ 
              color: '#6c757d', 
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: '500'
            }}
            onClick={() => setShowSelectedModal(true)}
          >
            📋 Toplam Seçilen: {toplamSecilen} adet (Detayları Gör)
          </small>
          <strong className="text-success" style={{ color: '#198754', fontSize: '1.1rem' }}>₺{toplamTutar.toFixed(2)}</strong>
        </div>
        <Button
          className="w-100"
          variant="success"
          disabled={saving}
          onClick={handleSaveAll}
          style={{
            backgroundColor: saving ? '#6c757d' : '#198754',
            borderColor: saving ? '#6c757d' : '#198754',
            color: '#ffffff',
            fontWeight: '600',
            padding: '12px 0',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px'
          }}
        >
          {saving ? "Kaydediliyor..." : "Tümünü Kaydet ve Gönder"}
        </Button>
      </div>

      {/* Seçilen Ürünler Modal */}
      <Modal show={showSelectedModal} onHide={() => setShowSelectedModal(false)} size="lg" centered>
        <Modal.Header closeButton style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
          <Modal.Title style={{ color: '#495057', fontWeight: '600' }}>
            📋 Seçilen Ürünler ({toplamSecilen} adet)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#ffffff', maxHeight: '60vh', overflowY: 'auto' }}>
          {Object.entries(quantities).filter(([id, qty]) => qty && parseFloat(qty) > 0).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <div style={{ fontSize: '3em', marginBottom: '16px' }}>🛒</div>
              <p>Henüz ürün seçmediniz.</p>
            </div>
          ) : (
            <div className="row g-3">
              {Object.entries(quantities).filter(([id, qty]) => qty && parseFloat(qty) > 0).map(([productId, qty]) => {
                const product = products.find(p => p.id === productId);
                if (!product) return null;
                const toplam = parseFloat(product.unitPrice) * parseFloat(qty);
                return (
                  <div key={productId} className="col-12" style={{ marginBottom: '12px' }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong style={{ color: '#343a40', fontSize: '16px' }}>{product.name}</strong>
                          <div style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
                            {parseFloat(qty)} adet × ₺{parseFloat(product.unitPrice).toFixed(2)}
                          </div>
                        </div>
                        <div style={{
                          backgroundColor: '#198754',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          ₺{toplam.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
          <div className="w-100 d-flex justify-content-between align-items-center">
            <strong style={{ color: '#495057', fontSize: '18px' }}>
              Toplam: ₺{toplamTutar.toFixed(2)}
            </strong>
            <Button 
              variant="secondary" 
              onClick={() => setShowSelectedModal(false)}
              style={{
                backgroundColor: '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                fontWeight: '600',
                padding: '8px 20px'
              }}
            >
              Kapat
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default UnifiedEntryPanel;
