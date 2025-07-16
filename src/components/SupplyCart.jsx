import React from "react";

export default function SupplyCart({ cart = [], onConfirm, onRemove }) {
  return (
    <div className="card p-3 mt-3">
      <div className="fw-bold mb-2">Sepet</div>
      {cart.length === 0 ? (
        <div className="text-muted">Sepetiniz şu an boş.</div>
      ) : (
        <ul className="list-group mb-3">
          {cart.map((item, i) => (
            <li key={item.name} className="list-group-item d-flex align-items-center justify-content-between">
              <span>{item.name} <b className="ms-2">x{item.quantity}</b></span>
              <button className="btn btn-danger btn-sm" onClick={() => onRemove(item.name)}>Çıkar</button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-success w-100" disabled={cart.length === 0} onClick={onConfirm}>
        Sepeti Onayla
      </button>
    </div>
  );
}
