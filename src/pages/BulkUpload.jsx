// src/pages/BulkUpload.jsx

import React, { useState } from "react";
import { ref, push } from "firebase/database";
import { db } from "../firebase/config";
import * as XLSX from "xlsx";
import {
  Container,
  Form,
  Button,
  Alert,
  Card,
} from "react-bootstrap";

const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setPreview(json.slice(0, 5)); // ön izleme ilk 5 satır
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: "danger", text: "Lütfen bir Excel dosyası seçin." });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const filteredData = jsonData.filter(
          (item) => item.name && item.unitPrice && item.category
        );

        for (const product of filteredData) {
          await push(ref(db, "products"), {
            name: product.name,
            unitPrice: parseFloat(product.unitPrice),
            category: product.category.trim(),
            createdAt: new Date().toISOString(),
          });
        }

        setStatus({ type: "success", text: `✔ ${filteredData.length} ürün başarıyla eklendi.` });
        setFile(null);
        setPreview([]);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Yükleme hatası:", err);
      setStatus({ type: "danger", text: "Yükleme sırasında hata oluştu." });
    }
  };

  return (
    <Container className="mt-4">
      <Card className="shadow-sm rounded-4 p-4">
        <h4 className="mb-3">📂 Excel ile Toplu Ürün Yükle</h4>

        {status && <Alert variant={status.type}>{status.text}</Alert>}

        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Excel Dosyası Seç (.xlsx)</Form.Label>
          <Form.Control
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
          />
        </Form.Group>

        {preview.length > 0 && (
          <Alert variant="info">
            <strong>📋 Ön İzleme:</strong>
            <ul className="mb-0 mt-2 small">
              {preview.map((item, i) => (
                <li key={i}>
                  {item.name} – ₺{item.unitPrice} – {item.category}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <Button variant="primary" onClick={handleUpload}>
          🔄 Yükle ve Kaydet
        </Button>
      </Card>
    </Container>
  );
};

export default BulkUpload;
