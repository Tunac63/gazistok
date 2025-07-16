import React from "react";

export default function SupplyCategoryBox({ icon, title, onClick }) {
  return (
    <div className="card text-center shadow-sm p-3 mb-3" style={{cursor:'pointer', minWidth:180}} onClick={onClick}>
      <div style={{fontSize:40}}>{icon}</div>
      <div className="fw-bold mt-2" style={{fontSize:18}}>{title}</div>
    </div>
  );
}
