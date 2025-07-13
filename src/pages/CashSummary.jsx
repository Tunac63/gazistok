import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, query, orderByKey, startAt, endAt, get } from "firebase/database";
import { Container, Row, Col, Card, Form, Button, Table } from "react-bootstrap";
import { format, parseISO } from "date-fns";

const CashSummary = () => {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01")); // Ay başı
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd")); // Bugün
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState({});
  const [summary, setSummary] = useState({
    totalCashIn: 0,
    totalVisaIn: 0,
    totalCashExpense: 0,
    totalCardExpense: 0,
    totalCarry: 0,
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const cashRef = ref(db, "cashRecords");
      const cashQuery = query(cashRef, orderByKey(), startAt(startDate), endAt(endDate));
      const snapshot = await get(cashQuery);
      const data = snapshot.val() || {};

      let totalCashIn = 0,
        totalVisaIn = 0,
        totalCashExpense = 0,
        totalCardExpense = 0,
        totalCarry = 0;

      Object.entries(data).forEach(([date, record]) => {
        totalCashIn += record.cashIn || 0;
        totalVisaIn += record.visaIn || 0;
        totalCashExpense += record.cashExpense || 0;
        totalCardExpense += record.cardExpense || 0;
        totalCarry = record.todayCarry || totalCarry; // Gün sonu devir en son günün değeri
      });

      setRecords(data);
      setSummary({
        totalCashIn,
        totalVisaIn,
        totalCashExpense,
        totalCardExpense,
        totalCarry,
      });
    } catch (error) {
      console.error("Kasa özeti alınırken hata:", error);
      setRecords({});
      setSummary({
        totalCashIn: 0,
        totalVisaIn: 0,
        totalCashExpense: 0,
        totalCardExpense: 0,
        totalCarry: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRecords();
  };

  return (
    <Container className="my-4">
      <h4 className="mb-4">📊 Aylık Kasa Özeti</h4>
      <Form onSubmit={handleSubmit} className="mb-4">
        <Row className="align-items-end">
          <Col md={4}>
            <Form.Label>Başlangıç Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </Col>
          <Col md={4}>
            <Form.Label>Bitiş Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={format(new Date(), "yyyy-MM-dd")}
            />
          </Col>
          <Col md={4}>
            <Button type="submit" className="w-100">
              Güncelle
            </Button>
          </Col>
        </Row>
      </Form>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <>
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center p-3 bg-primary text-white rounded-4 shadow-sm">
                <h5>💵 Toplam Nakit Satış</h5>
                <p className="fs-4">₺{summary.totalCashIn.toFixed(2)}</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center p-3 bg-info text-white rounded-4 shadow-sm">
                <h5>💳 Toplam Visa/Kart Satış</h5>
                <p className="fs-4">₺{summary.totalVisaIn.toFixed(2)}</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center p-3 bg-danger text-white rounded-4 shadow-sm">
                <h5>➖ Toplam Nakit Masraf</h5>
                <p className="fs-4">₺{summary.totalCashExpense.toFixed(2)}</p>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center p-3 bg-warning text-white rounded-4 shadow-sm">
                <h5>💳 Toplam Kart Masraf</h5>
                <p className="fs-4">₺{summary.totalCardExpense.toFixed(2)}</p>
              </Card>
            </Col>
          </Row>

          <Card className="p-3 mb-4 rounded-4 shadow-sm bg-light text-center">
            <h5>📌 Gün Sonu Devir</h5>
            <p className="fs-3 fw-bold">₺{summary.totalCarry.toFixed(2)}</p>
          </Card>

          {/* İstersen buraya detay tablo da ekleyebiliriz */}
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Nakit Satış</th>
                <th>Visa Satış</th>
                <th>Nakit Masraf</th>
                <th>Kart Masraf</th>
                <th>Gün Sonu Devir</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(records).map(([date, record]) => (
                <tr key={date}>
                  <td>{format(parseISO(date), "dd.MM.yyyy")}</td>
                  <td>₺{(record.cashIn || 0).toFixed(2)}</td>
                  <td>₺{(record.visaIn || 0).toFixed(2)}</td>
                  <td>₺{(record.cashExpense || 0).toFixed(2)}</td>
                  <td>₺{(record.cardExpense || 0).toFixed(2)}</td>
                  <td>₺{(record.todayCarry || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </Container>
  );
};

export default CashSummary;
