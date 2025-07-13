import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { ref, get, push } from "firebase/database";
import { Form, Button, Alert } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const QuickEntryPanel = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(new Date());
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await get(ref(db, "products"));
        const data = snapshot.val();
        if (data) {
          const productList = Object.entries(data).map(([id, val]) => ({
            id,
            ...val,
          }));
          setProducts(productList);
        }
      } catch (err) {
        console.error("Ürün çekme hatası:", err);
      }
    };

    fetchProducts();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const totalCost = selectedProduct
    ? parseFloat(selectedProduct.unitPrice) * Number(quantity || 0)
    : 0;

  const formatDateKey = (dateObj) => {
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProductId || !quantity || Number(quantity) <= 0) {
      setMessage({ type: "danger", text: "Ürün ve geçerli miktar girilmelidir." });
      return;
    }

    const entryDate = date.toISOString();
    const dateKey = formatDateKey(date);
    const user = auth.currentUser;

    const productData = {
      name: selectedProduct.name,
      quantity: Number(quantity),
      unitPrice: parseFloat(selectedProduct.unitPrice),
      totalCost,
    };

    const entryData = {
      products: [productData],
      date: entryDate,
      approved: false,
      userEmail: user?.email || "bilinmiyor",
    };

    try {
      await push(ref(db, `dailyInvoices/${dateKey}`), entryData);
      await push(ref(db, "entries"), {
        ...entryData,
        adminApproved: false,
      });

      setMessage({
        type: "success",
        text: `✔ ${selectedProduct.name} - ${quantity} adet başarıyla kaydedildi.`,
      });
      setSelectedProductId("");
      setQuantity("");
      setDate(new Date());
    } catch (err) {
      console.error("Kayıt hatası:", err);
      setMessage({
        type: "danger",
        text: "Hata oluştu. Lütfen tekrar deneyin.",
      });
    }
  };

  return (
    <div className="container mt-4">
      <h4>Tarihe Göre Eksik Ürün Girişi</h4>
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <Form
        onSubmit={handleSubmit}
        className="d-flex flex-wrap gap-3 align-items-end"
      >
        <Form.Group>
          <Form.Label>Ürün Seç</Form.Label>
          <Form.Select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">Ürün Seçin...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (₺{p.unitPrice})
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        <Form.Group>
          <Form.Label>Miktar</Form.Label>
          <Form.Control
            type="number"
            min={1}
            placeholder="Adet"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Form.Group>

        <Form.Group>
          <Form.Label>Tarih</Form.Label>
          <DatePicker
            selected={date}
            onChange={(val) => setDate(val)}
            className="form-control"
            dateFormat="dd-MM-yyyy"
          />
        </Form.Group>

        <div>
          <Form.Label>Toplam</Form.Label>
          <div className="mb-2">₺{totalCost.toFixed(2)}</div>
          <Button type="submit" variant="success">
            💾 Kaydet
          </Button>
        </div>
      </Form>

      <hr className="mt-4" />
      <Button
        variant="secondary"
        onClick={() => {
          setSelectedProductId("");
          setQuantity("");
          setDate(new Date());
          setMessage(null);
        }}
      >
        ➕ Yeni Giriş
      </Button>
    </div>
  );
};

export default QuickEntryPanel;
