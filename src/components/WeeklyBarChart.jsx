// src/components/WeeklyBarChart.jsx

import React from "react";
import { Card } from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const WeeklyBarChart = ({ chartData }) => (
  <Card className="shadow-sm mb-4">
    <Card.Body>
      <h6 className="mb-3">📈 Haftalık Giriş Grafiği</h6>
      <Bar key="weekly-bar" data={chartData} options={{ responsive: true }} />
    </Card.Body>
  </Card>
);

export default WeeklyBarChart;