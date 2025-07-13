import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, get, set } from "firebase/database";
import {
  Container,
  Card,
  Row,
  Col,
  Form,
  Button,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { format } from "date-fns";

const CashEntryAdvanced = () => {
  const [previousCarry, setPreviousCarry] = useState(null);
  const [previousCarryValue, setPreviousCarryValue] = useState("");
  const [cashIn, setCashIn] = useState("");
  const [visaIn, setVisaIn] = useState("");
  const [cashExpenses, setCashExpenses] = useState([{ desc: "", amount: "" }]);
  const [cardExpenses, setCardExpenses] = useState([{ desc: "", amount: "" }]);
  const [note, setNote] = useState("");
  const [todayCarry, setTodayCarry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const firebaseKeyDate = format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(), "dd/MM/yyyy");

  const getPreviousDate = (dateStr) => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - 1);
    return format(date, "yyyy-MM-dd");
  };

  useEffect(() => {
    const prevDate = getPreviousDate(firebaseKeyDate);
    get(ref(db, `cashRecords/${prevDate}/todayCarry`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const numVal = typeof val === "number" ? val : parseFloat(val);
          const finalVal = !isNaN(numVal) ? numVal : 0;
          setPreviousCarry(finalVal);
          setPreviousCarryValue(finalVal.toString());
        } else {
          setPreviousCarry(null);
          setPreviousCarryValue("");
        }
      })
      .catch((err) => {
        console.error("Önceki devir yükleme hatası:", err);
        setPreviousCarry(null);
        setPreviousCarryValue("");
      })
      .finally(() => setLoading(false));
  }, [firebaseKeyDate]);

  // Masraf değişiklikleri yönetimi
  const handleCashExpenseChange = (index, field, value) => {
    const list = [...cashExpenses];
    list[index][field] = value;
    setCashExpenses(list);
  };
  const handleCardExpenseChange = (index, field, value) => {
    const list = [...cardExpenses];
    list[index][field] = value;
    setCardExpenses(list);
  };
  const addCashExpense = () => setCashExpenses([...cashExpenses, { desc: "", amount: "" }]);
  const removeCashExpense = (index) => {
    if (cashExpenses.length === 1) return;
    const list = [...cashExpenses];
    list.splice(index, 1);
    setCashExpenses(list);
  };
  const addCardExpense = () => setCardExpenses([...cardExpenses, { desc: "", amount: "" }]);
  const removeCardExpense = (index) => {
    if (cardExpenses.length === 1) return;
    const list = [...cardExpenses];
    list.splice(index, 1);
    setCardExpenses(list);
  };

  // Toplam masraf hesaplama
  const sumAmounts = (list) =>
    list.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);

  // Devir hesaplama (önceki devir + nakit giriş - nakit masraf)
  const hesaplaDevir = (prevCarry, cashInVal, cashExpenseVal) => {
    const devir = prevCarry + cashInVal - cashExpenseVal;
    return devir >= 0 ? devir : 0;
  };

  useEffect(() => {
    if (previousCarry !== null) {
      const cashInNum = parseFloat(cashIn) || 0;
      const cashExpenseNum = sumAmounts(cashExpenses);
      const newDevir = hesaplaDevir(previousCarry, cashInNum, cashExpenseNum);
      setTodayCarry(newDevir);
    }
  }, [previousCarry, cashIn, cashExpenses]);

  // Para formatlama TR biçiminde
  const formatCurrency = (num) =>
    num.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Önceki devir kaydı (ilk defa veya düzeltme için)
  const handlePreviousCarrySubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(previousCarryValue);
    if (isNaN(val) || val < 0) {
      setError("Lütfen geçerli bir sayı girin.");
      return;
    }
    try {
      const prevDate = getPreviousDate(firebaseKeyDate);
      await set(ref(db, `cashRecords/${prevDate}/todayCarry`), val);
      setPreviousCarry(val);
      setError(null);
    } catch (err) {
      console.error("Önceki devir kayıt hatası:", err);
      setError("Kayıt sırasında hata oluştu.");
    }
  };

  // Günlük kasa kaydı kaydetme
  const handleSave = async () => {
    try {
      await set(ref(db, `cashRecords/${firebaseKeyDate}`), {
        previousCarry,
        cashIn: parseFloat(cashIn) || 0,
        visaIn: parseFloat(visaIn) || 0,
        cashExpenses,
        cardExpenses,
        note,
        todayCarry,
      });
      alert("Kasa girişi başarıyla kaydedildi.");
      setCashIn("");
      setVisaIn("");
      setCashExpenses([{ desc: "", amount: "" }]);
      setCardExpenses([{ desc: "", amount: "" }]);
      setNote("");
      setPreviousCarry(todayCarry);
      setPreviousCarryValue(todayCarry.toString());
    } catch (err) {
      console.error("Kayıt hatası:", err);
      alert("Kayıt sırasında hata oluştu. Konsolu kontrol edin.");
    }
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <h5>Veriler yükleniyor...</h5>
      </Container>
    );
  }

  // Eğer önceki devir yoksa önce onu gir
  if (previousCarry === null) {
    return (
      <Container className="my-5" style={{ maxWidth: 400 }}>
        <Card body>
          <h5>📥 Önceki Devir Girişi</h5>
          <Form onSubmit={handlePreviousCarrySubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Önceki Devir (Net Bakiye)</Form.Label>
              <Form.Control
                type="number"
                min={0}
                step="0.01"
                value={previousCarryValue}
                onChange={(e) => setPreviousCarryValue(e.target.value)}
                placeholder="Önceki devri giriniz"
                required
              />
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" className="w-100">
              Kaydet
            </Button>
          </Form>
        </Card>
      </Container>
    );
  }

  // Ana kasa girişi ekranı
  return (
    <Container className="my-4">
      <Card body>
        <h5>📥 Günlük Kasa Girişi - {displayDate}</h5>
        <Row className="mb-3">
          <Col>
            <Form.Label>Önceki Devir (Net Bakiye)</Form.Label>
            <Form.Control
              value={formatCurrency(previousCarry)}
              readOnly
              style={{ backgroundColor: "#e9ecef" }}
            />
          </Col>
          <Col>
            <Form.Label>Nakit Satış</Form.Label>
            <Form.Control
              type="number"
              value={cashIn}
              onChange={(e) => setCashIn(e.target.value)}
              placeholder="₺"
            />
          </Col>
          <Col>
            <Form.Label>Visa/Kredi Kartı Satış</Form.Label>
            <Form.Control
              type="number"
              value={visaIn}
              onChange={(e) => setVisaIn(e.target.value)}
              placeholder="₺"
            />
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <h6>Nakit Masraflar</h6>
            {cashExpenses.map((expense, idx) => (
              <InputGroup className="mb-2" key={idx}>
                <Form.Control
                  placeholder="Açıklama"
                  value={expense.desc}
                  onChange={(e) =>
                    handleCashExpenseChange(idx, "desc", e.target.value)
                  }
                />
                <Form.Control
                  type="number"
                  placeholder="Tutar"
                  value={expense.amount}
                  onChange={(e) =>
                    handleCashExpenseChange(idx, "amount", e.target.value)
                  }
                />
                <Button
                  variant="danger"
                  onClick={() => removeCashExpense(idx)}
                  disabled={cashExpenses.length === 1}
                >
                  Sil
                </Button>
              </InputGroup>
            ))}
            <Button variant="success" onClick={addCashExpense}>
              + Masraf Ekle
            </Button>
          </Col>

          <Col md={6}>
            <h6>Kart Masraflar</h6>
            {cardExpenses.map((expense, idx) => (
              <InputGroup className="mb-2" key={idx}>
                <Form.Control
                  placeholder="Açıklama"
                  value={expense.desc}
                  onChange={(e) =>
                    handleCardExpenseChange(idx, "desc", e.target.value)
                  }
                />
                <Form.Control
                  type="number"
                  placeholder="Tutar"
                  value={expense.amount}
                  onChange={(e) =>
                    handleCardExpenseChange(idx, "amount", e.target.value)
                  }
                />
                <Button
                  variant="danger"
                  onClick={() => removeCardExpense(idx)}
                  disabled={cardExpenses.length === 1}
                >
                  Sil
                </Button>
              </InputGroup>
            ))}
            <Button variant="success" onClick={addCardExpense}>
              + Masraf Ekle
            </Button>
          </Col>
        </Row>

        <Row className="mt-3">
          <Col md={12}>
            <Form.Label>Notlar</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Col>
        </Row>

        <Row className="mt-4">
          <Col md={6}>
            <h5>Gün Sonu Devir</h5>
            <Card className="p-3 bg-light text-center">
              <h3>₺{formatCurrency(todayCarry)}</h3>
            </Card>
          </Col>
          <Col md={6}>
            <Button className="w-100" onClick={handleSave}>
              💾 Kaydet
            </Button>
          </Col>
        </Row>
      </Card>
    </Container>
  );
};

export default CashEntryAdvanced;
