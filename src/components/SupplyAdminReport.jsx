import React from "react";

export default function SupplyAdminReport({ reports }) {
  // reports: [{user, date, items: [{product, quantity}]}]
  return (
    <div>
      <h4>Stok & Tedarik Raporları</h4>
      {/* Raporlar burada listelenecek */}
      <div className="text-muted">Henüz rapor yok.</div>
    </div>
  );
}
