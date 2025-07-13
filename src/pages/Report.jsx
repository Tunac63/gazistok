import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { ref, onValue, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import {
  Container,
  Table,
  Spinner,
  Card,
  Row,
  Col,
  Badge,
} from "react-bootstrap";

const Report = () => {
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

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
    if (!authChecked) return;

    const invRef = ref(db, "dailyInvoices");
    const unsubscribe = onValue(invRef, (snap) => {
      const data = snap.val() || {};
      const grouped = {};

      Object.entries(data).forEach(([dayKey, dayEntries]) => {
        Object.entries(dayEntries).forEach(([entryKey, entry]) => {
          if (!entry || typeof entry !== "object") return;
          if (!isAdmin && entry.approved !== true) return;

          const products = Array.isArray(entry.products)
            ? entry.products
            : [{
                name: entry.productName,
                unitPrice: entry.unitPrice,
                quantity: entry.quantity,
              }];

          products.forEach((prod) => {
            const name = prod.name || prod.productName;
            const unitPrice = parseFloat(prod.unitPrice);
            const quantity = parseFloat(prod.quantity);
            if (!name || isNaN(unitPrice) || isNaN(quantity)) return;

            if (!grouped[name]) {
              grouped[name] = {
                name,
                quantity: 0,
                total: 0,
                unitPrice: unitPrice // ilk ürün baz alınır
              };
            }

            grouped[name].quantity += quantity;
            grouped[name].total += unitPrice * quantity;
          });
        });
      });

      setEntries(grouped);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authChecked, isAdmin]);

  const totalCost = Object.values(entries).reduce((sum, e) => sum + e.total, 0);
  const totalQuantity = Object.values(entries).reduce((sum, e) => sum + e.quantity, 0);

  if (!authChecked || loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mt-2">Rapor verileri yükleniyor...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h3 className="fw-bold text-primary">📊 Ürün Raporu</h3>
        </Col>
        <Col className="text-end">
          <Badge bg="info" pill className="fs-6 me-2">
            Toplam Adet: {totalQuantity}
          </Badge>
          <Badge bg="success" pill className="fs-6">
            Toplam Tutar: ₺{totalCost.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
          </Badge>
        </Col>
      </Row>

      <Card className="shadow-sm rounded-4 border-0">
        <Card.Body>
          <Table responsive hover className="align-middle">
            <thead className="table-light">
              <tr>
                <th>📦 Ürün Adı</th>
                <th>🔢 Toplam Miktar</th>
                <th>💰 Birim Fiyat</th>
                <th>💸 Toplam Tutar</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(entries).map((item, idx) => (
                <tr key={idx}>
                  <td className="fw-medium">{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>
                    ₺{(item.unitPrice ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="fw-bold text-success">
                    ₺{(item.total ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Report;
