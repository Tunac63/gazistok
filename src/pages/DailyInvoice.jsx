// Tüm isteklerin entegre edildiği tam DailyInvoice.jsx dosyası (onay, düzenleme, silme özellikli)
// Aşağıya tek parça olarak tüm kod yerleştirilmiştir

import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { ref, get, update, remove } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { Card, Table, Spinner, Badge, Button, Modal, Form } from "react-bootstrap";
import { format } from "date-fns";
import tr from "date-fns/locale/tr";

const DailyInvoice = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editDayKey, setEditDayKey] = useState(null);
  const [editData, setEditData] = useState({ deliveredBy: "", description: "", products: [] });
  const [productList, setProductList] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false);
        setAuthChecked(true);
        return;
      }
      try {
        const roleSnap = await get(ref(db, `users/${user.uid}/role`));
        setIsAdmin(roleSnap.val() === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceSnap, productSnap] = await Promise.all([
          get(ref(db, "dailyInvoices")),
          get(ref(db, "products"))
        ]);

        if (invoiceSnap.exists()) {
          setEntries(invoiceSnap.val());
        } else {
          setEntries([]);
        }

        if (productSnap.exists()) {
          const products = productSnap.val() || {};
          const productArray = Object.entries(products).map(([id, p]) => ({ id, ...p }));
          setProductList(productArray);
        }
      } catch (err) {
        console.error("Veri alınırken hata oluştu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleEdit = (dayKey, recordsObj) => {
    const entryKey = Object.keys(recordsObj)[0];
    const entry = recordsObj[entryKey];
    const products = Array.isArray(entry.products)
      ? entry.products
      : [{ name: entry.productName, quantity: entry.quantity, unitPrice: entry.unitPrice }];

    setEditData({
      deliveredBy: entry.deliveredBy || "",
      description: entry.description || "",
      products
    });
    setEditDayKey(dayKey);
    setShowModal(true);
  };

  const handleApprove = async (dayKey) => {
    try {
      const updates = {};
      const keys = Object.keys(entries[dayKey]);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        updates[`dailyInvoices/${dayKey}/${key}/approved`] = true;
      }

      await update(ref(db), updates);
      alert("✔ İrsaliye onaylandı.");
      window.location.reload();
    } catch (err) {
      console.error("Onay hatası:", err);
    }
  };

  const handleDelete = async (dayKey) => {
    if (!window.confirm("Bu günü tamamen silmek istediğinizden emin misiniz?")) return;
    try {
      await remove(ref(db, `dailyInvoices/${dayKey}`));
      alert("🗑️ Gün başarıyla silindi.");
      window.location.reload();
    } catch (err) {
      console.error("Silme hatası:", err);
      alert("❌ Silinirken hata oluştu.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editDayKey) return;
    try {
      const updates = {};
      const keys = Object.keys(entries[editDayKey]);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        updates[`dailyInvoices/${editDayKey}/${key}`] = {
          deliveredBy: editData.deliveredBy,
          description: editData.description,
          approved: false,
          products: editData.products.map(p => {
            const existing = productList.find(x => x.name === p.name);
            const price = existing ? existing.unitPrice : p.unitPrice;
            return {
              name: p.name,
              unitPrice: parseFloat(price),
              quantity: parseFloat(p.quantity),
              totalCost: parseFloat(price) * parseFloat(p.quantity)
            };
          })
        };
      }
      await update(ref(db), updates);
      alert("✔ İrsaliye güncellendi.");
      setShowModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Güncelleme hatası:", err);
    }
  };

  const handleAddProduct = () => {
    setEditData({
      ...editData,
      products: [...editData.products, { name: "", unitPrice: 0, quantity: 0 }]
    });
  };

  const handleRemoveProduct = (index) => {
    const updated = [...editData.products];
    updated.splice(index, 1);
    setEditData({ ...editData, products: updated });
  };

  const renderDaySection = (day, recordsObj) => {
    let totalAmount = 0;
    let totalQuantity = 0;
    const isApproved = Object.values(recordsObj).every((r) => r.approved);

    const allRows = Object.entries(recordsObj).flatMap(([key, entry], entryIndex) => {
      const products = Array.isArray(entry.products)
        ? entry.products
        : entry.productName
        ? [{ name: entry.productName, unitPrice: entry.unitPrice, quantity: entry.quantity }]
        : [];

      return products.map((product, i) => {
        const unitPrice = parseFloat(product.unitPrice) || 0;
        const quantity = parseFloat(product.quantity) || 0;
        const total = unitPrice * quantity;
        totalAmount += total;
        totalQuantity += quantity;

        const productName = product.name || "—";

        return (
          <tr key={`${key}-${i}`}>
            <td>{entryIndex + 1}.{i + 1}</td>
            <td>{productName}</td>
            <td>{unitPrice.toFixed(2)}</td>
            <td>{quantity}</td>
            <td>{total.toFixed(2)}</td>
            <td>
              {entry.approved ? (
                <Badge bg="success">Onaylı</Badge>
              ) : (
                <Badge bg="warning">Bekliyor</Badge>
              )}
            </td>
          </tr>
        );
      });
    });

    const teslimEden = recordsObj[Object.keys(recordsObj)[0]]?.deliveredBy || "—";
    const aciklama = recordsObj[Object.keys(recordsObj)[0]]?.description || "";

    return (
      <Card className="mb-4 shadow-sm rounded-4" key={day}>
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-center">
            <span>{format(new Date(day.split("-").reverse().join("-")), "d MMMM yyyy, EEEE", { locale: tr })}</span>
            {isAdmin && (
              <div className="d-flex gap-2">
                {!isApproved && (
                  <Button variant="success" size="sm" onClick={() => handleApprove(day)}>✅ Onayla</Button>
                )}
                <Button variant="outline-primary" size="sm" onClick={() => handleEdit(day, recordsObj)}>
                  📝 Düzenle
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(day)}>🗑️ Sil</Button>
              </div>
            )}
          </Card.Title>

          <div className="mb-2 text-muted">
            <small>👤 Teslim Eden: <strong>{teslimEden}</strong></small><br />
            <small>📝 Açıklama: <i>{aciklama || "—"}</i></small>
          </div>

          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                <th>#</th>
                <th>Ürün Adı</th>
                <th>Birim Fiyat (₺)</th>
                <th>Adet</th>
                <th>Tutar (₺)</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>{allRows}</tbody>
          </Table>

          <div className="fw-bold">
            Toplam Adet: <span className="text-primary">{totalQuantity}</span> — Toplam Tutar: <span className="text-success">₺{totalAmount.toFixed(2)}</span>
          </div>
        </Card.Body>
      </Card>
    );
  };

  if (!authChecked || loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-2 text-muted">Yükleniyor...</div>
      </div>
    );
  }

  const sortedDays = Object.keys(entries).sort((a, b) => {
    const [d1, m1, y1] = a.split("-").map(Number);
    const [d2, m2, y2] = b.split("-").map(Number);
    return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1);
  });

  return (
    <div className="container-fluid px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">🧾 Günlük İrsaliye</h3>
        <Badge bg="info" pill className="fs-6">{sortedDays.length} gün</Badge>
      </div>
      {sortedDays.length === 0 ? (
        <p className="text-muted">Kayıtlı giriş bulunmamaktadır.</p>
      ) : (
        sortedDays.map((day) => renderDaySection(day, entries[day]))
      )}

      {/* Düzenleme Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>İrsaliye Düzenle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Teslim Eden</Form.Label>
            <Form.Control
              value={editData.deliveredBy}
              onChange={(e) => setEditData({ ...editData, deliveredBy: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Açıklama</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
          </Form.Group>

          {editData.products.map((p, i) => (
            <div key={i} className="border rounded p-3 mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <strong>Ürün {i + 1}</strong>
                <Button variant="outline-danger" size="sm" onClick={() => handleRemoveProduct(i)}>Ürünü Sil</Button>
              </div>
              <Form.Group className="mb-2">
                <Form.Label>Ürün Adı</Form.Label>
                <Form.Select
                  value={p.name}
                  onChange={(e) => {
                    const updated = [...editData.products];
                    updated[i].name = e.target.value;
                    const selected = productList.find(x => x.name === e.target.value);
                    updated[i].unitPrice = selected?.unitPrice || 0;
                    setEditData({ ...editData, products: updated });
                  }}>
                  <option value="">Ürün Seç</option>
                  {productList.map((item, idx) => (
                    <option key={idx} value={item.name}>{item.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Birim Fiyat</Form.Label>
                <Form.Control
                  type="number"
                  value={p.unitPrice}
                  onChange={(e) => {
                    const updated = [...editData.products];
                    updated[i].unitPrice = e.target.value;
                    setEditData({ ...editData, products: updated });
                  }} />
              </Form.Group>
              <Form.Group>
                <Form.Label>Adet</Form.Label>
                <Form.Control
                  type="number"
                  value={p.quantity}
                  onChange={(e) => {
                    const updated = [...editData.products];
                    updated[i].quantity = e.target.value;
                    setEditData({ ...editData, products: updated });
                  }} />
              </Form.Group>
            </div>
          ))}

          <Button variant="outline-success" onClick={handleAddProduct}>➕ Yeni Ürün Ekle</Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>İptal</Button>
          <Button variant="primary" onClick={handleSaveEdit}>Kaydet</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DailyInvoice;