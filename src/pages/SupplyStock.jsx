import React, { useState, useEffect } from "react";
import "./SupplyStock.css";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase/config";
import { push, ref, get } from "firebase/database";
import SupplyProductSearch from "../components/SupplyProductSearch";
import productsData from "../components/supplyProducts.json";
import { Modal, Button } from "react-bootstrap";

function SupplyStock() {
  const [user] = useAuthState(auth);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Her ürün için ayrı state'ler
  const [productInputs, setProductInputs] = useState({});

  const UNIT_GROUPS = [
    { group: "Ağırlık", options: ["kg", "gr", "ton"] },
    { group: "Hacim", options: ["lt", "ml", "m3"] },
    { group: "Adet", options: ["adet", "koli", "paket", "kutu"] },
    { group: "Uzunluk", options: ["m", "cm"] },
  ];

  useEffect(() => {
    async function fetchApprovedOrders() {
      try {
        const snap = await get(ref(db, "supplyOrders"));
        if (snap.exists()) {
          const val = snap.val();
          const arr = Object.entries(val)
            .map(([id, o]) => ({ id, ...o }))
            .filter(o => o.status === "approved");
          setApprovedOrders(arr);
        }
      } catch {
        setApprovedOrders([]);
      }
    }
    fetchApprovedOrders();
  }, []);

  function handleAddToCart(product, qty, unit, weight) {
    if (!qty || qty <= 0) {
      alert("Lütfen geçerli bir miktar giriniz!");
      return;
    }
    setCart(prev => [...prev, { 
      ...product, 
      quantity: parseFloat(qty), 
      unit: unit || 'adet', 
      weight: weight || '',
      id: Date.now() // Unique ID for cart item
    }]);
    
    // Input alanlarını temizle
    setProductInputs(prev => ({
      ...prev,
      [product.name]: { gramaj: '', quantity: '', unit: 'kg' }
    }));
  }

  // Input değerlerini güncelleme fonksiyonu
  const updateProductInput = (productName, field, value) => {
    setProductInputs(prev => ({
      ...prev,
      [productName]: {
        ...prev[productName],
        [field]: value
      }
    }));
  };

  // Sepetten ürün silme fonksiyonu
  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  async function handleLogin() {
    try {
      const snap = await get(ref(db, "cashEntryPassword"));
      if (snap.exists()) {
        const validPassword = snap.val();
        if (validPassword === password) {
          setError("");
          setIsAuthenticated(true);
          setProducts(productsData);
        } else {
          setError("Geçersiz şifre. Lütfen tekrar deneyin.");
        }
      } else {
        setError("Şifre doğrulama yapılamadı. Lütfen daha sonra tekrar deneyin.");
      }
    } catch (err) {
      setError("Bir hata oluştu: " + err.message);
    }
  }

  async function handleRequestPassword() {
    if (!user) {
      setSuccessMessage("Şifre talep etmek için giriş yapmalısınız!");
      setTimeout(() => setSuccessMessage(""), 5000);
      return;
    }
    
    try {
      const request = {
        user: user?.email || "anonim",
        requestTime: Date.now(),
        timestamp: Date.now(),
        status: "pending",
      };
      await push(ref(db, "passwordRequests"), request);
      setSuccessMessage("Şifre talebiniz admin'e iletildi! Kısa süre içinde değerlendirilecektir.");
      setTimeout(() => setSuccessMessage(""), 8000);
    } catch (err) {
      setSuccessMessage("Şifre talebi gönderilemedi: " + err.message);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  }

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
  };

  const closeModal = () => {
    setSelectedOrder(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-4">
        <div className="text-center mb-4">
          <h2 style={{ color: "#198754", fontWeight: "bold" }}>🔒 Bu Sayfa Şifre Korumalı</h2>
          <p className="text-muted">Lütfen şifrenizi girerek erişim sağlayın.</p>
        </div>
        <div className="card shadow-sm p-4" style={{ maxWidth: "400px", margin: "0 auto", border: "1px solid #198754" }}>
          <div className="mb-3">
            <label htmlFor="password" className="form-label" style={{ fontWeight: "bold" }}>Şifre</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="Şifrenizi girin"
              style={{ borderColor: "#198754" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </div>
          {error && <p className="text-danger">{error}</p>}
          <button
            className="btn btn-success w-100"
            style={{ fontWeight: "bold" }}
            onClick={handleLogin}
          >
            Giriş Yap
          </button>
          <div className="text-center mt-3">
            <button
              className="btn btn-link"
              style={{ 
                textDecoration: "none", 
                color: "#198754",
                border: "2px solid #198754",
                borderRadius: "8px",
                padding: "10px 20px",
                transition: "all 0.3s ease",
                fontWeight: "bold",
                fontSize: "14px"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#198754";
                e.target.style.color = "white";
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#198754";
                e.target.style.transform = "scale(1)";
              }}
              onClick={() => {
                handleRequestPassword();
              }}
            >
              🔑 Admin'den Şifre Talep Et
            </button>

            {/* Başarı mesajı */}
            {successMessage && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                color: '#155724',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✅ {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supply-stock">
      <div className="modern-container">
        <header className="modern-header">
          <h1>🏪 Supply Stock</h1>
          <p>Modern tedarik yönetim sistemi</p>
        </header>

        <section className="glass-card">
          <h2 className="section-title">📋 Onaylanmış Siparişler</h2>
          {approvedOrders.length > 0 ? (
            <div className="approved-orders-grid">
              {approvedOrders.map(order => (
                <div
                  key={order.id}
                  className="order-card"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="order-header">
                    <h3 className="order-user">👤 {order.user}</h3>
                  </div>
                  <div className="order-date">
                    📅 {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <ul className="order-products">
                    {order.products.map((product, index) => (
                      <li key={index} className="order-product">
                        <span>{product.name}</span>
                        <span>{product.quantity} {product.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>Henüz onaylanmış sipariş bulunmuyor.</p>
            </div>
          )}
        </section>

        {selectedOrder && (
          <div className="modal-modern">
            <div className="modal-content-modern">
              <button className="close-button-modern" onClick={closeModal}>
                ×
              </button>
              <h2 className="section-title">📋 Sipariş Detayları</h2>
              <div style={{ marginBottom: '20px' }}>
                <p><strong>👤 Kullanıcı:</strong> {selectedOrder.user}</p>
                <p><strong>📅 Tarih:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <h3 style={{ marginBottom: '15px', color: '#2d3748' }}>🛍️ Ürünler:</h3>
              <div className="cart-grid">
                {selectedOrder.products.map((product, index) => (
                  <div key={index} className="cart-item">
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>{product.name}</div>
                    <div style={{ color: '#718096' }}>
                      {product.quantity} {product.unit} {product.weight && `- ${product.weight}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <section className="glass-card">
          <h2 className="section-title">🛍️ Ürün Kataloğu</h2>
          <div className="product-grid">
            {products.map((product, index) => {
              const productKey = product.name;
              const inputs = productInputs[productKey] || { gramaj: '', quantity: '', unit: 'kg' };
              
              return (
                <div key={index} className="modern-product-card">
                  <h3 className="product-name-modern">📦 {product.name}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-group-modern">
                      <label className="form-label-modern">⚖️ Gramaj</label>
                      <input
                        type="number"
                        className="form-input-modern"
                        placeholder="Gramaj giriniz"
                        value={inputs.gramaj}
                        onChange={(e) => updateProductInput(productKey, 'gramaj', e.target.value)}
                      />
                    </div>
                    <div className="form-group-modern">
                      <label className="form-label-modern">📏 Birim</label>
                      <select
                        className="form-select-modern"
                        value={inputs.unit}
                        onChange={(e) => updateProductInput(productKey, 'unit', e.target.value)}
                      >
                        {UNIT_GROUPS.flatMap(group => group.options).map((unit, idx) => (
                          <option key={idx} value={unit}>{unit.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label className="form-label-modern">🔢 Miktar</label>
                      <input
                        type="number"
                        className="form-input-modern"
                        placeholder="Miktar giriniz"
                        value={inputs.quantity}
                        onChange={(e) => updateProductInput(productKey, 'quantity', e.target.value)}
                      />
                    </div>
                    <button
                      className="add-to-cart-modern"
                      onClick={() => handleAddToCart(
                        product, 
                        inputs.quantity, 
                        inputs.unit, 
                        inputs.gramaj
                      )}
                    >
                      🛒 Sepete Ekle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sticky Cart */}
        <div className="sticky-cart sticky-cart-mobile" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '320px',
          maxHeight: '70vh',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '25px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          padding: '25px',
          zIndex: 1000
        }}>
          <h3 style={{ 
            color: '#2d3748', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '15px'
          }}>
            🛒 Sepetim 
            <span style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {cart.length}
            </span>
          </h3>
          
          {cart.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((item, index) => (
                <div key={item.id || index} style={{
                  background: 'linear-gradient(135deg, #f0fff4, #f7fafc)',
                  padding: '15px',
                  borderRadius: '15px',
                  border: '2px solid #68d391',
                  borderLeft: '6px solid #48bb78',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => removeFromCart(item.id || index)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                  <div style={{ fontWeight: '600', marginBottom: '5px', color: '#2d3748', paddingRight: '30px' }}>
                    📦 {item.name}
                  </div>
                  <div style={{ color: '#718096', fontSize: '14px' }}>
                    {item.quantity} {item.unit} {item.weight && `(${item.weight}g)`}
                  </div>
                </div>
              ))}
              
              <button style={{
                width: '100%',
                background: 'linear-gradient(135deg, #48bb78, #38a169)',
                color: 'white',
                border: 'none',
                padding: '15px',
                borderRadius: '15px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '10px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 20px rgba(72, 187, 120, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}>
                ✅ Siparişi Tamamla ({cart.length} ürün)
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#718096' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🛒</div>
              <p style={{ margin: 0, fontSize: '14px' }}>Sepetiniz henüz boş</p>
            </div>
          )}
        </div>

        <section className="glass-card cart-section" style={{ marginTop: '40px' }}>
          <h2 className="section-title">� Sepet Özeti</h2>
          {cart.length > 0 ? (
            <div className="cart-grid">
              {cart.map((item, index) => (
                <div key={item.id || index} className="cart-item">
                  <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                    📦 {item.name}
                  </div>
                  <div style={{ color: '#718096' }}>
                    {item.quantity} {item.unit} {item.weight && `- ${item.weight}g`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <p>Sepetiniz henüz boş.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default SupplyStock;



