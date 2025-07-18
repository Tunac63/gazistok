import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SupplyStock.css";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase/config";
import { push, ref, get, remove } from "firebase/database";
import SupplyProductSearch from "../components/SupplyProductSearch";
import productsData from "../components/supplyProducts.json";
import { Modal, Button } from "react-bootstrap";
import StockCount from "./StockCount";

function SupplyStock() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(""); // "supply" veya "stock"
  const [showStockCount, setShowStockCount] = useState(false);
  const [authenticatedSystem, setAuthenticatedSystem] = useState(""); // hangi sistem için authenticated
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cartMinimized, setCartMinimized] = useState(window.innerWidth <= 768);
  
  // Her ürün için ayrı state'ler
  const [productInputs, setProductInputs] = useState({});
  
  // Yeni ürün ekleme için state'ler
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [addingProduct, setAddingProduct] = useState(false);

  // Admin kontrol fonksiyonu
  const isAdmin = () => {
    if (!user || !user.email) return false;
    const email = user.email.toLowerCase();
    return email.includes('gazi') || email.includes('admin') || email === 'admin@gazistok.com';
  };

  const UNIT_GROUPS = [
    { group: "Ağırlık", options: ["KG", "GR" ] },
    { group: "Hacim", options: ["LT", "ML"] },
    { group: "Adet", options: ["ADET", "KOLİ"] },
    { group: "Uzunluk", options: ["BAĞ"] },
  ];

  useEffect(() => {
    async function fetchApprovedOrders() {
      try {
        const snap = await get(ref(db, "supplyOrders"));
        if (snap.exists()) {
          const val = snap.val();
          const arr = Object.entries(val)
            .map(([id, o]) => ({ id, ...o }))
            .filter(o => o.status === "approved")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Tarihe göre sırala (yeni -> eski)
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
      setError("Lütfen geçerli bir adet giriniz!");
      setTimeout(() => setError(""), 3000);
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

  // Sipariş tamamlama fonksiyonu
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setError("Sepetiniz boş! Lütfen ürün ekleyiniz.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!user) {
      setError("Sipariş vermek için giriş yapmalısınız!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const orderData = {
        user: user.email || "anonim",
        products: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          weight: item.weight || ""
        })),
        status: "pending",
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      await push(ref(db, "supplyOrders"), orderData);
      
      // Sepeti temizle
      setCart([]);
      
      // Input alanlarını temizle
      setProductInputs({});
      
      setSuccessMessage("✅ Siparişiniz başarıyla gönderildi! Admin onayından sonra işleme alınacaktır.");
      setTimeout(() => setSuccessMessage(""), 5000);
      
    } catch (error) {
      console.error("Sipariş gönderme hatası:", error);
      setError("Sipariş gönderilirken hata oluştu: " + error.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  async function handleLogin() {
    try {
      console.log("=== ŞİFRE GİRİŞ DEBUG ===");
      console.log("Girilen şifre:", password);
      
      const userEmail = user?.email || "";
      const userUid = user?.uid || "";
      let isValidPassword = false;
      
      // Çoklu şifre sistemi kontrolü
      const passwordsSnap = await get(ref(db, "supplyStockPasswords"));
      if (passwordsSnap.exists()) {
        const passwords = passwordsSnap.val();
        console.log("Çoklu şifre sistemi bulundu");
        
        // Önce kullanıcının kendi şifresini kontrol et
        const cleanInputPassword = password.trim();
        if (userUid && passwords[userUid] === cleanInputPassword) {
          isValidPassword = true;
          console.log("✅ Kullanıcı UID şifresi eşleşti");
        } else if (userEmail) {
          // Email'i Firebase path uyumlu hale getir
          const emailKey = userEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_').replace(/[#$[\]]/g, '_');
          if (passwords[emailKey] === cleanInputPassword) {
            isValidPassword = true;
            console.log("✅ Kullanıcı email şifresi eşleşti");
          }
        } else {
          // Diğer tüm şifreleri kontrol et
          Object.values(passwords).forEach(pass => {
            if (pass === cleanInputPassword) {
              isValidPassword = true;
              console.log("✅ Genel şifre eşleşti");
            }
          });
        }
      }
      
      // Eski sistem uyumluluğu
      if (!isValidPassword) {
        const snap = await get(ref(db, "supplyStockPassword"));
        if (snap.exists()) {
          const validPassword = snap.val();
          const cleanInputPassword = password.trim();
          const cleanValidPassword = validPassword ? validPassword.trim() : "";
          
          if (cleanValidPassword === cleanInputPassword) {
            isValidPassword = true;
            console.log("✅ Eski sistem şifresi eşleşti");
          }
        }
      }
      
      console.log("=== DEBUG BİTİŞ ===");
      
      if (isValidPassword) {
        setError("");
        setIsAuthenticated(true);
        setAuthenticatedSystem("supply");
        setProducts(productsData);
        console.log("✅ Giriş başarılı!");
      } else {
        setError("Geçersiz şifre. Lütfen tekrar deneyin.");
        console.log("❌ Şifre eşleşmedi!");
      }
    } catch (err) {
      setError("Bir hata oluştu: " + err.message);
      console.error("❌ Giriş hatası:", err);
    }
  }

  async function handleStockLogin() {
    console.log("🔍 handleStockLogin fonksiyonu çağrıldı!");
    console.log("Password:", password);
    console.log("Selected system:", selectedSystem);
    
    try {
      console.log("=== STOK SAYIM ŞİFRE GİRİŞ DEBUG ===");
      console.log("Girilen şifre:", password);
      
      const userEmail = user?.email || "";
      const userUid = user?.uid || "";
      let isValidPassword = false;
      
      // Supply Stock ile aynı şifre sistemi kontrolü
      const passwordsSnap = await get(ref(db, "supplyStockPasswords"));
      if (passwordsSnap.exists()) {
        const passwords = passwordsSnap.val();
        console.log("Çoklu şifre sistemi bulundu", passwords);
        
        // Önce kullanıcının kendi şifresini kontrol et
        const cleanInputPassword = password.trim();
        if (userUid && passwords[userUid] === cleanInputPassword) {
          isValidPassword = true;
          console.log("✅ Kullanıcı UID şifresi eşleşti");
        } else if (userEmail) {
          // Email'i Firebase path uyumlu hale getir
          const emailKey = userEmail.replace(/\./g, '_DOT_').replace(/@/g, '_AT_').replace(/[#$[\]]/g, '_');
          console.log("Email key:", emailKey);
          if (passwords[emailKey] === cleanInputPassword) {
            isValidPassword = true;
            console.log("✅ Kullanıcı email şifresi eşleşti");
          }
        } else {
          // Diğer tüm şifreleri kontrol et
          Object.values(passwords).forEach(pass => {
            if (pass === cleanInputPassword) {
              isValidPassword = true;
              console.log("✅ Genel şifre eşleşti");
            }
          });
        }
      } else {
        console.log("❌ supplyStockPasswords tablosu bulunamadı");
      }
      
      // Eski sistem uyumluluğu
      if (!isValidPassword) {
        console.log("🔄 Eski sistem kontrol ediliyor...");
        const snap = await get(ref(db, "supplyStockPassword"));
        if (snap.exists()) {
          const validPassword = snap.val();
          const cleanInputPassword = password.trim();
          const cleanValidPassword = validPassword ? validPassword.trim() : "";
          
          console.log("Eski sistem şifresi:", cleanValidPassword);
          if (cleanValidPassword === cleanInputPassword) {
            isValidPassword = true;
            console.log("✅ Eski sistem şifresi eşleşti");
          }
        } else {
          console.log("❌ Eski sistem şifresi bulunamadı");
        }
      }
      
      console.log("=== STOK SAYIM DEBUG BİTİŞ ===");
      console.log("Final isValidPassword:", isValidPassword);
      
      if (isValidPassword) {
        console.log("✅ Şifre doğru - Stok sayım ekranı açılıyor...");
        setError("");
        setIsAuthenticated(true);
        setAuthenticatedSystem("stock");
        setShowStockCount(true);
        console.log("showStockCount set to true");
      } else {
        console.log("❌ Şifre yanlış!");
        setError("Geçersiz şifre. Lütfen tekrar deneyin.");
      }
    } catch (err) {
      console.error("❌ Stok sayım giriş hatası:", err);
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
        email: user?.email || "anonim",
        requestTime: Date.now(),
        timestamp: Date.now(),
        status: "pending",
      };
      // passwordRequests koleksiyonuna gönder (SupplyStock için ayrı sistem)
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

  // Türkçe karakter uyumlu arama fonksiyonu
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  };

  // Filtrelenmiş ürünler
  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    const normalizedProductName = normalizeText(product.name);
    const normalizedSearchTerm = normalizeText(searchTerm);
    return normalizedProductName.includes(normalizedSearchTerm);
  });

  // Yeni ürün ekleme fonksiyonu
  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      alert("Ürün adı boş olamaz!");
      return;
    }

    // Aynı isimde ürün var mı kontrol et
    const existingProduct = products.find(product => 
      product.name.toLowerCase() === newProductName.trim().toLowerCase()
    );

    if (existingProduct) {
      alert("Bu isimde bir ürün zaten mevcut!");
      return;
    }

    setAddingProduct(true);
    try {
      const newProduct = {
        name: newProductName.trim().toUpperCase(),
        quantity: 0
      };

      // Yeni ürünü products listesine ekle
      setProducts(prev => [...prev, newProduct]);
      
      // Modal'ı kapat ve state'leri temizle
      setShowAddProductModal(false);
      setNewProductName("");
      
      setSuccessMessage(`${newProduct.name} ürünü başarıyla eklendi!`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      alert("Ürün eklenirken hata oluştu: " + err.message);
    }
    setAddingProduct(false);
  };

  // Onaylanmış sipariş silme fonksiyonu
  const deleteApprovedOrder = async (orderId) => {
    try {
      await remove(ref(db, `supplyOrders/${orderId}`));
      
      // Local state'i güncelle
      setApprovedOrders(prev => prev.filter(order => order.id !== orderId));
      
      setSuccessMessage("Sipariş başarıyla silindi!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Sipariş silme hatası:", error);
      setError("Sipariş silinirken hata oluştu!");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Ürün silme fonksiyonu
  const handleDeleteProduct = async (productName) => {
    if (!isAdmin()) {
      alert("❌ Bu işlem için admin yetkisi gereklidir!");
      return;
    }

    if (!window.confirm(`"${productName}" ürünü kalıcı olarak silinecek. Emin misiniz?`)) {
      return;
    }

    try {
      // Ürünü listeden kaldır
      setProducts(prev => prev.filter(product => product.name !== productName));
      
      setSuccessMessage(`${productName} ürünü başarıyla silindi!`);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      alert("Ürün silinirken hata oluştu: " + err.message);
    }
  };

  // Sipariş raporu oluşturma fonksiyonu
  const generateOrderReport = () => {
    let report = '';

    approvedOrders.forEach((order, orderIndex) => {
      if (orderIndex > 0) report += '\n';
      
      order.products.forEach((product, productIndex) => {
        report += `${product.name} - ${product.gramaj} - ${product.quantity} ${product.unit}\n`;
      });
    });

    return report.trim();
  };

  // Rapor indirme fonksiyonu
  const downloadOrderReport = () => {
    const reportContent = generateOrderReport();
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\./g, '-');
    
    link.download = `Tedarik_Listesi_${today}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setSuccessMessage("📁 Liste başarıyla indirildi!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Hiçbir sisteme giriş yapılmamışsa veya farklı sistem seçildiyse giriş ekranını göster
  if (!isAuthenticated || (selectedSystem && authenticatedSystem !== selectedSystem)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: window.innerWidth <= 480 ? '20px' : '25px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          padding: window.innerWidth <= 480 ? '30px 20px' : '40px',
          maxWidth: '450px',
          width: '100%'
        }}>
          <div className="text-center mb-4">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              fontSize: '32px'
            }}>
              🏪
            </div>
            <h2 style={{ 
              color: '#2d3748', 
              fontWeight: '700',
              fontSize: '24px',
              marginBottom: '10px'
            }}>
              Dış Tedarik Ve Stok Sayım Sistemi
            </h2>
            <p style={{ 
              color: '#718096',
              fontSize: '14px',
              margin: '0 0 30px 0'
            }}>
              Hangi sisteme giriş yapmak istiyorsunuz?
            </p>
          </div>

          {/* Sistem Seçenekleri */}
          <div style={{ marginBottom: '30px' }}>
            <button
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '15px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setSelectedSystem("supply")}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              📦 Dış Tedarik Sipariş Sistemi
            </button>

            <button
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                border: 'none',
                borderRadius: '15px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
              onClick={() => setSelectedSystem("stock")}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              📊 Stok ve Sayım Sistemi
            </button>
          </div>

          {/* Şifre Girme Alanı - Sistem seçildikten sonra görünür */}
          {selectedSystem && (
            <>
              <div className="mb-3">
                <label htmlFor="password" style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#2d3748',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {selectedSystem === "supply" ? "Dış Tedarik Şifresi" : "Stok Sayım Şifresi"}
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="Şifrenizi girin"
                  style={{
                    width: '100%',
                    padding: '15px 18px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      selectedSystem === "supply" ? handleLogin() : handleStockLogin();
                    }
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = selectedSystem === "supply" ? '#667eea' : '#4f46e5';
                    e.target.style.boxShadow = `0 0 0 3px rgba(${selectedSystem === "supply" ? '102, 126, 234' : '79, 70, 229'}, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '15px',
                  background: selectedSystem === "supply" 
                    ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                    : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: selectedSystem === "supply" 
                    ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                    : '0 4px 15px rgba(79, 70, 229, 0.3)',
                  marginBottom: '20px'
                }}
                onClick={selectedSystem === "supply" ? handleLogin : handleStockLogin}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = selectedSystem === "supply" 
                    ? '0 6px 20px rgba(102, 126, 234, 0.4)' 
                    : '0 6px 20px rgba(79, 70, 229, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = selectedSystem === "supply" 
                    ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
                    : '0 4px 15px rgba(79, 70, 229, 0.3)';
                }}
              >
                {selectedSystem === "supply" ? "🚀 Dış Tedarik'e Giriş" : "📊 Stok Sayım'a Giriş"}
              </button>

              <div className="text-center">
                <button
                  style={{
                    background: 'transparent',
                    border: selectedSystem === "supply" ? '2px solid #667eea' : '2px solid #4f46e5',
                    borderRadius: '12px',
                    color: selectedSystem === "supply" ? '#667eea' : '#4f46e5',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = selectedSystem === "supply" ? '#667eea' : '#4f46e5';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = selectedSystem === "supply" ? '#667eea' : '#4f46e5';
                    e.target.style.transform = 'scale(1)';
                  }}
                  onClick={handleRequestPassword}
                >
                  🔑 Admin'den Şifre Talep Et
                </button>
              </div>
            </>
          )}

          {/* Geri Dönme Butonu */}
          {selectedSystem && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #718096',
                  borderRadius: '8px',
                  color: '#718096',
                  padding: '8px 16px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedSystem("");
                  setPassword("");
                  setError("");
                  setIsAuthenticated(false);
                  setAuthenticatedSystem("");
                  setShowStockCount(false);
                }}
              >
                ← Geri
              </button>
            </div>
          )}

          {/* Error ve Success Mesajları */}
          {(error || successMessage) && (
            <div style={{ marginTop: '20px' }}>
              {error && (
                <div style={{
                  padding: '12px 15px',
                  background: 'linear-gradient(135deg, #fee, #fdd)',
                  border: '1px solid #f87171',
                  borderRadius: '10px',
                  color: '#dc2626',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}>
                  ⚠️ {error}
                </div>
              )}
              
              {successMessage && (
                <div style={{
                  padding: '15px',
                  background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
                  border: '1px solid #28a745',
                  borderRadius: '12px',
                  color: '#155724',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.2)'
                }}>
                  ✅ {successMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Stok Sayım sistemi seçildiyse StockCount componentini göster
  if (showStockCount && authenticatedSystem === "stock") {
    return <StockCount onBack={() => {
      setShowStockCount(false);
      setIsAuthenticated(false);
      setAuthenticatedSystem("");
      setSelectedSystem("");
      setPassword("");
      setError("");
    }} />;
  }

  // Supply Stock sistemi için authenticated ise ana sayfayı göster
  if (isAuthenticated && authenticatedSystem === "supply") {
    return (
      <div className="supply-stock">
      <div className="modern-container">
        <header className="modern-header">
          <h1>📦 Dış Tedarik Yönetim Paneli</h1>
          <p>Malzeme sipariş ve stok yönetim sistemi</p>
        </header>

        {/* Error Notification */}
        {error && (
          <div style={{
            position: 'fixed',
            top: window.innerWidth <= 768 ? '10px' : '20px',
            right: window.innerWidth <= 768 ? '10px' : '20px',
            left: window.innerWidth <= 768 ? '10px' : 'auto',
            background: 'linear-gradient(135deg, #fff5f5, #fed7d7)',
            border: '1px solid #f56565',
            borderRadius: '15px',
            padding: window.innerWidth <= 480 ? '12px 15px' : '15px 20px',
            color: '#c53030',
            fontSize: window.innerWidth <= 480 ? '13px' : '14px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(245, 101, 101, 0.3)',
            zIndex: 1000,
            minWidth: window.innerWidth <= 768 ? 'auto' : '300px',
            animation: 'slideInRight 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: window.innerWidth <= 480 ? '16px' : '18px' }}>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div style={{
            position: 'fixed',
            top: window.innerWidth <= 768 ? '10px' : '20px',
            right: window.innerWidth <= 768 ? '10px' : '20px',
            left: window.innerWidth <= 768 ? '10px' : 'auto',
            background: 'linear-gradient(135deg, #f0fff4, #c6f6d5)',
            border: '1px solid #38a169',
            borderRadius: '15px',
            padding: window.innerWidth <= 480 ? '12px 15px' : '15px 20px',
            color: '#2f855a',
            fontSize: window.innerWidth <= 480 ? '13px' : '14px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(56, 161, 105, 0.3)',
            zIndex: 1000,
            minWidth: window.innerWidth <= 768 ? 'auto' : '300px',
            animation: 'slideInRight 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: window.innerWidth <= 480 ? '16px' : '18px' }}>✅</span>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <section className="glass-card" style={{ padding: '10px', marginBottom: '15px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px',
            flexWrap: window.innerWidth <= 480 ? 'wrap' : 'nowrap',
            gap: window.innerWidth <= 480 ? '8px' : '0'
          }}>
            <h2 className="section-title" style={{ 
              fontSize: '1.2rem', 
              margin: 0,
              flex: window.innerWidth <= 480 ? '1 1 100%' : 'auto'
            }}>
              📋 Onaylanmış Siparişler
            </h2>
            
            {approvedOrders.length > 0 && (
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                flex: window.innerWidth <= 480 ? '1 1 100%' : 'auto',
                justifyContent: window.innerWidth <= 480 ? 'center' : 'flex-end'
              }}>
                <button
                  onClick={() => {
                    const reportText = generateOrderReport();
                    navigator.clipboard.writeText(reportText).then(() => {
                      setSuccessMessage("📋 Ürün listesi panoya kopyalandı!");
                      setTimeout(() => setSuccessMessage(""), 3000);
                    });
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #48bb78, #38a169)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: window.innerWidth <= 480 ? '6px 10px' : '8px 12px',
                    fontSize: window.innerWidth <= 480 ? '10px' : '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  📱 WhatsApp
                </button>
                
                <button
                  onClick={() => downloadOrderReport()}
                  style={{
                    background: 'linear-gradient(135deg, #4299e1, #3182ce)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: window.innerWidth <= 480 ? '6px 10px' : '8px 12px',
                    fontSize: window.innerWidth <= 480 ? '10px' : '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(66, 153, 225, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  💾 İndir
                </button>
              </div>
            )}
          </div>
          {approvedOrders.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: window.innerWidth <= 480 ? '8px' : '10px',
              maxHeight: window.innerWidth <= 480 ? '350px' : '300px',
              overflowY: 'auto',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px'
            }}>
              {approvedOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                    borderRadius: window.innerWidth <= 480 ? '12px' : '14px',
                    padding: window.innerWidth <= 480 ? '12px' : '16px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: window.innerWidth <= 480 ? '80px' : '90px'
                  }}
                  onClick={() => handleOrderClick(order)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.12)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`${order.user} kullanıcısının siparişini silmek istediğinizden emin misiniz?`)) {
                        deleteApprovedOrder(order.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: window.innerWidth <= 480 ? '8px' : '10px',
                      right: window.innerWidth <= 480 ? '8px' : '10px',
                      background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: window.innerWidth <= 480 ? '24px' : '26px',
                      height: window.innerWidth <= 480 ? '24px' : '26px',
                      fontSize: window.innerWidth <= 480 ? '12px' : '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
                      transition: 'all 0.3s ease',
                      zIndex: 10
                    }}
                    onMouseOver={(e) => {
                      e.target.style.opacity = '0.8';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.opacity = '1';
                      e.target.style.transform = 'scale(1)';
                    }}
                  >
                    ×
                  </button>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: window.innerWidth <= 480 ? '8px' : '10px',
                    paddingRight: window.innerWidth <= 480 ? '32px' : '36px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                        fontWeight: '600',
                        color: '#2d3748'
                      }}>
                        👤 {order.user.length > 12 ? order.user.substring(0, 12) + '...' : order.user}
                      </span>
                    </div>
                    <span style={{
                      fontSize: window.innerWidth <= 480 ? '11px' : '12px',
                      color: '#718096',
                      background: '#edf2f7',
                      padding: '3px 6px',
                      borderRadius: '6px',
                      fontWeight: '500'
                    }}>
                      📅 {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: window.innerWidth <= 480 ? '8px' : '10px',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '6px',
                      color: '#2d3748',
                      fontSize: window.innerWidth <= 480 ? '12px' : '13px'
                    }}>
                      📦 {order.products.length} ürün siparişi
                    </div>
                    <div style={{
                      maxHeight: window.innerWidth <= 480 ? '45px' : '50px',
                      overflowY: 'auto',
                      fontSize: window.innerWidth <= 480 ? '11px' : '12px'
                    }}>
                      {order.products.map((product, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '2px 0',
                          borderBottom: idx < order.products.length - 1 ? '1px solid #e2e8f0' : 'none'
                        }}>
                          <span style={{ 
                            fontWeight: '500', 
                            color: '#4a5568',
                            flex: 1,
                            marginRight: '8px'
                          }}>
                            • {product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name}
                          </span>
                          <span style={{ 
                            color: '#667eea', 
                            fontSize: window.innerWidth <= 480 ? '10px' : '11px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}>
                            {product.gramaj} | {product.quantity} {product.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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

        {/* Yeni Ürün Ekleme Butonu */}
        <div style={{ 
          textAlign: 'center', 
          margin: window.innerWidth <= 480 ? '10px 0' : '15px 0',
          padding: window.innerWidth <= 480 ? '5px' : '10px'
        }}>
          <button
            onClick={() => {
              if (isAdmin()) {
                setShowAddProductModal(true);
              } else {
                alert("❌ Bu işlem için admin yetkisi gereklidir!");
              }
            }}
            style={{
              background: isAdmin() 
                ? 'linear-gradient(135deg, #667eea, #764ba2)' 
                : 'linear-gradient(135deg, #a0aec0, #718096)',
              color: 'white',
              border: 'none',
              borderRadius: window.innerWidth <= 480 ? '10px' : '12px',
              padding: window.innerWidth <= 480 ? '10px 16px' : '12px 24px',
              fontSize: window.innerWidth <= 480 ? '12px' : '14px',
              fontWeight: '600',
              cursor: isAdmin() ? 'pointer' : 'not-allowed',
              boxShadow: isAdmin() 
                ? '0 8px 20px rgba(102, 126, 234, 0.3)' 
                : '0 4px 10px rgba(160, 174, 192, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: window.innerWidth <= 480 ? '6px' : '8px',
              margin: '0 auto',
              opacity: isAdmin() ? 1 : 0.7,
              width: window.innerWidth <= 480 ? 'auto' : 'auto',
              maxWidth: window.innerWidth <= 480 ? '280px' : 'none'
            }}
            onMouseOver={(e) => {
              if (isAdmin()) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 25px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseOut={(e) => {
              if (isAdmin()) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {isAdmin() ? '➕' : '🚫'}
            </span>
            {isAdmin() ? 'Yeni Ürün Ekle' : 'Admin Yetkisi Gerekli'}
          </button>
        </div>

        {/* Arama ve Filtreleme */}
        <div style={{ 
          position: 'relative', 
          marginBottom: '15px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '12px',
          padding: '15px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <input
            type="text"
            placeholder="🔍 Ürün ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 45px 12px 15px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s ease',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#a0aec0',
            fontSize: '16px'
          }}>
            🔍
          </div>
          
          {searchTerm && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#667eea',
              fontWeight: '500'
            }}>
              📋 {filteredProducts.length} ürün bulundu
            </div>
          )}
        </div>

          <div className="product-grid">
            {filteredProducts.map((product, index) => {
              const productKey = product.name;
              const inputs = productInputs[productKey] || { gramaj: '', quantity: '', unit: 'kg' };
              
              return (
                <div key={index} className="modern-product-card">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px',
                    flexWrap: window.innerWidth <= 480 ? 'wrap' : 'nowrap',
                    gap: window.innerWidth <= 480 ? '8px' : '0'
                  }}>
                    <h3 className="product-name-modern" style={{ 
                      margin: 0,
                      fontSize: window.innerWidth <= 480 ? '14px' : '16px',
                      flex: window.innerWidth <= 480 ? '1 1 100%' : '1',
                      textAlign: window.innerWidth <= 480 ? 'center' : 'left'
                    }}>
                      📦 {product.name}
                    </h3>
                    <button
                      onClick={() => {
                        if (isAdmin()) {
                          handleDeleteProduct(product.name);
                        } else {
                          alert("❌ Bu işlem için admin yetkisi gereklidir!");
                        }
                      }}
                      style={{
                        background: isAdmin() 
                          ? 'linear-gradient(135deg, #e53e3e, #c53030)'
                          : 'linear-gradient(135deg, #a0aec0, #718096)',
                        color: 'white',
                        border: 'none',
                        borderRadius: window.innerWidth <= 480 ? '8px' : '6px',
                        padding: window.innerWidth <= 480 ? '6px 12px' : '4px 8px',
                        fontSize: window.innerWidth <= 480 ? '12px' : '10px',
                        fontWeight: '600',
                        cursor: isAdmin() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        opacity: isAdmin() ? 1 : 0.5,
                        minWidth: window.innerWidth <= 480 ? '60px' : '50px',
                        height: window.innerWidth <= 480 ? '32px' : '24px',
                        alignSelf: window.innerWidth <= 480 ? 'center' : 'flex-start'
                      }}
                      onMouseOver={(e) => {
                        if (isAdmin()) {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.background = 'linear-gradient(135deg, #c53030, #9c2626)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (isAdmin()) {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
                        }
                      }}
                    >
                      {isAdmin() ? '🗑️' : '🚫'}
                    </button>
                  </div>
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
                      <label className="form-label-modern">🔢 Adet</label>
                      <input
                        type="number"
                        className="form-input-modern"
                        placeholder="Adet giriniz"
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

        {/* Universal Floating Cart Button */}
        {cart.length > 0 && (
          <button
            onClick={() => setCartMinimized(!cartMinimized)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              width: window.innerWidth <= 768 ? '65px' : '75px',
              height: window.innerWidth <= 768 ? '65px' : '75px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              fontSize: window.innerWidth <= 768 ? '26px' : '30px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.5)',
              zIndex: 9999,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.15)';
              e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.5)';
            }}
          >
            <div style={{ position: 'relative' }}>
              🛒
              <span style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                color: 'white',
                borderRadius: '50%',
                width: window.innerWidth <= 768 ? '24px' : '26px',
                height: window.innerWidth <= 768 ? '24px' : '26px',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                border: '2px solid white'
              }}>
                {cart.length}
              </span>
            </div>
          </button>
        )}

        {/* Universal Cart Modal */}
        {!cartMinimized && cart.length > 0 && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1500,
            display: 'flex',
            alignItems: window.innerWidth <= 768 ? 'flex-end' : 'center',
            justifyContent: window.innerWidth <= 768 ? 'stretch' : 'center'
          }}
          onClick={() => setCartMinimized(true)}
          >
            <div 
              style={{
                background: 'white',
                borderRadius: window.innerWidth <= 768 ? '25px 25px 0 0' : '25px',
                padding: '25px',
                width: window.innerWidth <= 768 ? '100%' : '450px',
                maxWidth: window.innerWidth <= 768 ? '100%' : '90vw',
                maxHeight: window.innerWidth <= 768 ? '70vh' : '80vh',
                overflowY: 'auto',
                animation: window.innerWidth <= 768 ? 'slideUp 0.3s ease-out' : 'fadeIn 0.3s ease-out',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '25px',
                paddingBottom: '20px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                  fontWeight: '700',
                  color: '#2d3748',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  🛒 Sepetim 
                  <span style={{
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {cart.length}
                  </span>
                </h3>
                <button
                  onClick={() => setCartMinimized(true)}
                  style={{
                    background: 'linear-gradient(135deg, #f7fafc, #edf2f7)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#718096',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a52)';
                    e.target.style.color = 'white';
                    e.target.style.borderColor = '#ff6b6b';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #f7fafc, #edf2f7)';
                    e.target.style.color = '#718096';
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                marginBottom: '25px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {cart.map((item, index) => (
                  <div key={item.id || index} style={{
                    background: 'linear-gradient(135deg, rgba(248,250,252,0.8), rgba(237,242,247,0.8))',
                    padding: '16px',
                    borderRadius: '15px',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    borderLeft: '4px solid #667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.9))';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(248,250,252,0.8), rgba(237,242,247,0.8))';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{
                      flex: 1,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748'
                    }}>
                      📦 {item.name}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        {item.quantity} {item.unit}
                      </span>
                      {item.weight && (
                        <span style={{
                          background: 'linear-gradient(135deg, #4fd1c7, #36b37e)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {item.weight}g
                        </span>
                      )}
                      <button
                        onClick={() => removeFromCart(item.id || index)}
                        style={{
                          background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 6px 15px rgba(255, 107, 107, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleSubmitOrder}
                style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                padding: '18px',
                borderRadius: '15px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.5)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }}
              >
                ✅ Siparişi Tamamla ({cart.length} ürün)
              </button>
            </div>
          </div>
        )}

        {/* Yeni Ürün Ekleme Modal */}
        {showAddProductModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                color: '#2d3748',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                ➕ Yeni Ürün Ekle
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#4a5568',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Ürün Adı
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Ürün adını girin..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowAddProductModal(false);
                    setNewProductName("");
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#4a5568',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#cbd5e0';
                    e.target.style.background = '#f7fafc';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = 'white';
                  }}
                >
                  İptal
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={addingProduct || !newProductName.trim()}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: addingProduct || !newProductName.trim() 
                      ? '#a0aec0' 
                      : 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: addingProduct || !newProductName.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {addingProduct ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sipariş Detay Modal */}
        {selectedOrder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#2d3748',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  📦 Sipariş Detayı
                </h3>
                <button
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#a0aec0',
                    padding: '0',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f7fafc';
                    e.target.style.color = '#4a5568';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#a0aec0';
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #edf2f7, #e2e8f0)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#2d3748' }}>👤 Kullanıcı:</strong>
                  <span style={{ marginLeft: '8px', color: '#4a5568' }}>{selectedOrder.user}</span>
                </div>
                <div>
                  <strong style={{ color: '#2d3748' }}>📅 Tarih:</strong>
                  <span style={{ marginLeft: '8px', color: '#4a5568' }}>
                    {new Date(selectedOrder.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  margin: '0 0 15px 0',
                  color: '#2d3748',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  📋 Sipariş Listesi
                </h4>
                
                {selectedOrder.products.map((product, index) => (
                  <div key={index} style={{
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '10px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '8px'
                    }}>
                      {index + 1}. {product.name}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      fontSize: '14px',
                      color: '#4a5568'
                    }}>
                      <div>
                        <strong>⚖️ Gramaj:</strong> {product.gramaj}
                      </div>
                      <div>
                        <strong>📦 Adet:</strong> {product.quantity} {product.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    const singleOrderReport = selectedOrder.products.map(p => 
                      `${p.name} - ${p.gramaj} - ${p.quantity} ${p.unit}`
                    ).join('\n');
                    navigator.clipboard.writeText(singleOrderReport).then(() => {
                      setSuccessMessage("📋 Ürün listesi panoya kopyalandı!");
                      setTimeout(() => setSuccessMessage(""), 3000);
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #48bb78, #38a169)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(72, 187, 120, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  📱 Kopyala
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    padding: '10px 20px',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#4a5568',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = '#cbd5e0';
                    e.target.style.background = '#f7fafc';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = 'white';
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  }

  // Eğer hiçbir koşul sağlanmıyorsa giriş ekranını göster (fallback)
  return null;
}

export default SupplyStock;



