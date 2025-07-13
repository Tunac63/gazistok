// src/components/CategoryPieChart.jsx

import React from "react";
import { Card } from "react-bootstrap";
import { Pie } from "react-chartjs-2";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

const CategoryPieChart = ({ pieData }) => (
  <Card className="shadow-sm mb-4">
    <Card.Body>
      <h6 className="mb-3">🧩 Ürün Kategori Dağılımı</h6>
      <Pie key="category-pie" data={pieData} options={{ responsive: true }} />
    </Card.Body>
  </Card>
);

export default CategoryPieChart;