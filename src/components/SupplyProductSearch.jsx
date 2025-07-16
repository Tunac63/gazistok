import React, { useState } from "react";
import "./SupplyProductSearch.css";

export default function SupplyProductSearch({ products, unitGroups, onAddToCart }) {
  const [selectedUnit, setSelectedUnit] = useState(unitGroups[0].options[0]);
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="supply-product-search">
      <input
        className="form-control search-bar"
        placeholder="Ürün ara..."
        onChange={(e) => console.log(e.target.value)}
      />
      <ul className="list-group product-list">
        {products.map((product, index) => (
          <li key={index} className="list-group-item product-item">
            <div className="product-info">
              <h5 className="product-name">{product.name}</h5>
            </div>
            <div className="product-actions">
              <div className="action-group">
                <label htmlFor="unit" className="form-label">Birim:</label>
                <select
                  id="unit"
                  className="form-select unit-select"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  {unitGroups.flatMap(group => group.options).map((unit, idx) => (
                    <option key={idx} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
              <div className="action-group">
                <label htmlFor="quantity" className="form-label">Adet:</label>
                <input
                  id="quantity"
                  type="number"
                  className="form-control quantity-input"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <button
                className="btn btn-primary add-to-cart-btn"
                onClick={() => onAddToCart(product, quantity, selectedUnit)}
              >
                Sepete Ekle
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
