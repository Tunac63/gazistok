import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';
import './StockCount.css';

const StockCount = ({ onBack }) => {
  console.log("🔍 StockCount component render ediliyor!");
  
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [countValue, setCountValue] = useState("");
  const [countedProducts, setCountedProducts] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Hammadde',
    unit: 'adet',
    expectedStock: 0
  });

  const auth = getAuth();
  const db = getDatabase();
  const user = auth.currentUser;

  // Admin kontrolü
  const isAdmin = () => {
    const adminEmails = ['gazi@tuna.com', 'admin@gazistok.com'];
    return user?.email && adminEmails.includes(user.email);
  };

  useEffect(() => {
    console.log("🔍 StockCount useEffect çalışıyor - ürünler yükleniyor");
    // Örnek ürün listesi - gerçek ürünlerle değiştirilecek
    const productList = [
      // DEMİRBAŞLAR
      { id: 1, name: "Kahve Makinesi", category: "Demirbaş", expectedStock: 2, unit: "adet" },
      { id: 2, name: "Blender", category: "Demirbaş", expectedStock: 3, unit: "adet" },
      { id: 3, name: "Fırın", category: "Demirbaş", expectedStock: 1, unit: "adet" },
      { id: 4, name: "Buzdolabı", category: "Demirbaş", expectedStock: 2, unit: "adet" },
      { id: 5, name: "Derin Dondurucu", category: "Demirbaş", expectedStock: 1, unit: "adet" },
      
      // HAMMADDELER
      { id: 6, name: "Un", category: "Hammadde", expectedStock: 50, unit: "kg" },
      { id: 7, name: "Şeker", category: "Hammadde", expectedStock: 30, unit: "kg" },
      { id: 8, name: "Tereyağı", category: "Hammadde", expectedStock: 20, unit: "kg" },
      { id: 9, name: "Süt", category: "Hammadde", expectedStock: 40, unit: "litre" },
      { id: 10, name: "Yumurta", category: "Hammadde", expectedStock: 200, unit: "adet" },
      { id: 11, name: "Çikolata", category: "Hammadde", expectedStock: 15, unit: "kg" },
      { id: 12, name: "Vanilya", category: "Hammadde", expectedStock: 5, unit: "şişe" },
      { id: 13, name: "Kakao", category: "Hammadde", expectedStock: 10, unit: "kg" },
      { id: 14, name: "Krema", category: "Hammadde", expectedStock: 25, unit: "litre" },
      { id: 15, name: "Meyve Konservesi", category: "Hammadde", expectedStock: 30, unit: "kutu" },
    ];
    setProducts(productList);
    setFilteredProducts(productList);
  }, []);

  // Arama fonksiyonu
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(term.toLowerCase()) ||
        product.category.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  // Ürün silme fonksiyonu
  const deleteProduct = (productId) => {
    const updatedProducts = products.filter(p => p.id !== productId);
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
    
    // Eğer silinen ürün şu anki ürünse, başa dön
    if (products[currentProductIndex]?.id === productId) {
      setCurrentProductIndex(0);
    }
    // Eğer index'i etkilendiyse düzelt
    else if (currentProductIndex >= updatedProducts.length) {
      setCurrentProductIndex(Math.max(0, updatedProducts.length - 1));
    }
    
    // Sayım verilerinden de kaldır
    const updatedCountedProducts = countedProducts.filter(cp => cp.id !== productId);
    setCountedProducts(updatedCountedProducts);
    
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  // Silme onay dialog'u göster
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  // Yeni ürün ekleme fonksiyonu
  const addNewProduct = () => {
    if (!newProduct.name.trim()) return;
    
    const newId = Math.max(...products.map(p => p.id)) + 1;
    const productToAdd = {
      ...newProduct,
      id: newId,
      name: newProduct.name.trim()
    };
    
    const updatedProducts = [...products, productToAdd];
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
    
    // Yeni ürünü seç
    setCurrentProductIndex(updatedProducts.length - 1);
    
    // Formu temizle
    setNewProduct({
      name: '',
      category: 'Hammadde',
      unit: 'adet',
      expectedStock: 0
    });
    setShowAddProduct(false);
    setSearchTerm("");
  };

  // Ürün seçme fonksiyonu
  const selectProduct = (productId) => {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
      setCurrentProductIndex(productIndex);
      setShowSearch(false);
      setSearchTerm("");
      setFilteredProducts(products);
    }
  };

  const handleCount = () => {
    if (!countValue.trim()) {
      setError("Lütfen sayım değeri girin!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const currentProduct = products[currentProductIndex];
    const newCountedProduct = {
      ...currentProduct,
      actualCount: parseFloat(countValue),
      countedAt: new Date().toISOString(),
      difference: parseFloat(countValue) - currentProduct.expectedStock
    };

    setCountedProducts(prev => [...prev, newCountedProduct]);
    setCountValue("");
    setError("");
    
    if (currentProductIndex < products.length - 1) {
      setCurrentProductIndex(prev => prev + 1);
    } else {
      // Sayım tamamlandı
      saveCountResults();
    }
  };

  const saveCountResults = async () => {
    try {
      const countData = {
        countDate: new Date().toISOString(),
        countedBy: user?.email || "anonim",
        products: countedProducts,
        totalProducts: products.length,
        status: "pending", // Yeni: Onay bekliyor
        submittedAt: new Date().toISOString(),
        summary: {
          totalItems: countedProducts.length,
          totalExpected: countedProducts.reduce((sum, p) => sum + p.expectedStock, 0),
          totalActual: countedProducts.reduce((sum, p) => sum + p.actualCount, 0),
          totalDifference: countedProducts.reduce((sum, p) => sum + p.difference, 0)
        }
      };

      // Bekleyen sayımlar listesine ekle
      await set(ref(db, `pendingStockCounts/${Date.now()}`), countData);
      setSuccessMessage("✅ Sayım admin onayına gönderildi!");
      setIsCompleted(true);
    } catch (error) {
      setError("Sayım kaydedilirken hata oluştu: " + error.message);
    }
  };

  const skipProduct = () => {
    const currentProduct = products[currentProductIndex];
    const skippedProduct = {
      ...currentProduct,
      actualCount: null,
      countedAt: new Date().toISOString(),
      skipped: true,
      difference: null
    };

    setCountedProducts(prev => [...prev, skippedProduct]);
    setCountValue("");
    setError("");
    
    if (currentProductIndex < products.length - 1) {
      setCurrentProductIndex(prev => prev + 1);
    } else {
      saveCountResults();
    }
  };

  const goBack = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(prev => prev - 1);
      // Son kaydedilen ürünü kaldır
      setCountedProducts(prev => prev.slice(0, -1));
      setCountValue("");
      setError("");
    }
  };

  console.log("🔍 StockCount render - products:", products);
  console.log("🔍 StockCount render - currentProductIndex:", currentProductIndex);

  const currentProduct = products[currentProductIndex];

  // Arama ekranı - artık kullanmıyoruz, direkt ana ekranda göstereceğiz
  // if (showSearch) {
  //   return (
  //     ...arama ekranı kodu...
  //   );
  // }

  // Yeni ürün ekleme ekranı
  if (showAddProduct) {
    return (
      <div className="stock-count">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #f0f4f8 0%, #faf8f5 100%)',
            padding: '25px',
            borderRadius: '20px',
            border: '1px solid #e8e5e5'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '25px' 
            }}>
              <h2 style={{ margin: 0, color: '#5a6c7d', fontSize: '20px' }}>
                ➕ Yeni Ürün Ekle
              </h2>
              <button 
                onClick={() => setShowAddProduct(false)}
                style={{
                  background: '#e53e3e',
                  border: 'none',
                  borderRadius: '50%',
                  color: 'white',
                  width: '35px',
                  height: '35px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#5a6c7d', 
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Ürün Adı *
              </label>
              <input
                type="text"
                placeholder="Ürün adını yazın..."
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e0d7d7',
                  borderRadius: '12px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#5a6c7d', 
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Kategori
              </label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  border: '2px solid #e0d7d7',
                  borderRadius: '12px',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="Hammadde">Hammadde</option>
                <option value="Demirbaş">Demirbaş</option>
                <option value="Temizlik">Temizlik</option>
                <option value="Ambalaj">Ambalaj</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#5a6c7d', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Birim
                </label>
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    border: '2px solid #e0d7d7',
                    borderRadius: '12px',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="adet">adet</option>
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="gram">gram</option>
                  <option value="kutu">kutu</option>
                  <option value="şişe">şişe</option>
                  <option value="paket">paket</option>
                </select>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#5a6c7d', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  Beklenen Stok
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newProduct.expectedStock}
                  onChange={(e) => setNewProduct({...newProduct, expectedStock: parseFloat(e.target.value) || 0})}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '16px',
                    border: '2px solid #e0d7d7',
                    borderRadius: '12px',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                />
              </div>
            </div>
            
            <button
              onClick={addNewProduct}
              disabled={!newProduct.name.trim()}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '15px',
                cursor: newProduct.name.trim() ? 'pointer' : 'not-allowed',
                background: newProduct.name.trim() 
                  ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' 
                  : '#cbd5e0',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
            >
              ✅ Ürünü Ekle ve Sayıma Geç
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Silme onay dialog'u
  if (showDeleteConfirm && productToDelete) {
    return (
      <div className="stock-count">
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
            padding: '30px',
            borderRadius: '20px',
            border: '2px solid #feb2b2',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ 
              margin: '0 0 15px 0', 
              color: '#c53030', 
              fontSize: '22px' 
            }}>
              Ürünü Sil
            </h2>
            <p style={{ 
              margin: '0 0 25px 0', 
              color: '#744210', 
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              <strong>"{productToDelete.name}"</strong> ürünü kalıcı olarak silinecek.
              <br />Bu işlem geri alınamaz!
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProductToDelete(null);
                }}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: '2px solid #a0aec0',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#4a5568',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                ❌ İptal
              </button>
              
              <button
                onClick={() => deleteProduct(productToDelete.id)}
                style={{
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                🗑️ Evet, Sil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tamamlama durumu kontrolü
  if (isCompleted) {
    return (
      <div className="stock-count">
        <div className="container">
          <div className="completed">
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
              <h2 style={{ color: '#2d3748', fontSize: '24px', marginBottom: '15px' }}>
                Sayım Admin Onayına Gönderildi!
              </h2>
              <p style={{ color: '#4a5568', fontSize: '16px', marginBottom: '30px' }}>
                {countedProducts.length} ürün sayımı admin onayı bekliyor
              </p>
              
              <div style={{
                background: '#e6fffa',
                border: '2px solid #38b2ac',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{ color: '#234e52', margin: '0 0 10px 0', fontSize: '18px' }}>
                  ℹ️ Bilgilendirme
                </h3>
                <p style={{ color: '#285e61', margin: 0, fontSize: '14px' }}>
                  Sayımınız admin tarafından onaylandıktan sonra:<br/>
                  • 📊 Excel raporu otomatik oluşturulacak<br/>
                  • 📱 WhatsApp raporu hazırlanacak<br/>
                  • 📈 Stok veritabanı güncellenecek
                </p>
              </div>
              
              {successMessage && (
                <div style={{
                  background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
                  border: '1px solid #28a745',
                  borderRadius: '12px',
                  color: '#155724',
                  padding: '15px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {successMessage}
                </div>
              )}
              
              <button
                onClick={onBack}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Ana Menüye Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-count">
      <div className="container">
        {/* Hata ve Başarı Mesajları - Üstte */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
            border: '2px solid #f87171',
            borderRadius: '15px',
            color: '#dc2626',
            padding: '15px 20px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            position: 'relative',
            animation: 'slideDown 0.3s ease-out'
          }}>
            ⚠️ {error}
            <button
              onClick={() => setError("")}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            border: '2px solid #10b981',
            borderRadius: '15px',
            color: '#047857',
            padding: '15px 20px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            position: 'relative',
            animation: 'slideDown 0.3s ease-out'
          }}>
            {successMessage}
            <button
              onClick={() => setSuccessMessage("")}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#047857',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '2px solid #4a5568',
                borderRadius: '8px',
                color: '#4a5568',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ← Ana Menü
            </button>
          </div>
          <h1>📊 Aylık Stok Sayımı</h1>
          <p>Mağaza stok kontrol sistemi</p>
        </header>

        {currentProduct ? (
          <div className="count-card">
            {/* Arama Kutusu - Yumuşak renklerle */}
            <div className="search-section" style={{ 
              background: 'linear-gradient(135deg, #f0f4f8 0%, #faf8f5 100%)',
              padding: '20px',
              borderRadius: '20px',
              marginBottom: '25px',
              border: '1px solid #e8e5e5'
            }}>
              <h3 style={{ 
                margin: '0 0 15px 0', 
                color: '#5a6c7d',
                fontSize: '16px',
                fontWeight: '500'
              }}>🔍 Ürün Ara ve Seç</h3>
              <input
                type="text"
                placeholder="Ürün adı yazın... (örn: Kahve, Un, Şeker)"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '16px',
                  border: '2px solid #e0d7d7',
                  borderRadius: '15px',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#4a5568',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#b8a082';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 160, 130, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0d7d7';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                }}
              />
              
              {/* Arama Sonuçları */}
              {searchTerm && filteredProducts.length > 0 && (
                <div style={{ 
                  marginTop: '15px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e0d7d7'
                }}>
                  {filteredProducts.slice(0, 5).map((product) => (
                    <div 
                      key={product.id}
                      style={{
                        padding: '12px 15px',
                        borderBottom: '1px solid #f1ebe6',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div 
                        onClick={() => selectProduct(product.id)}
                        style={{
                          cursor: 'pointer',
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.parentElement.style.background = '#faf8f5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.parentElement.style.background = '#ffffff';
                        }}
                      >
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#4a5568',
                          marginBottom: '3px'
                        }}>
                          {product.name}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#8a8a8a',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span>{product.category}</span>
                          <span>{product.expectedStock} {product.unit}</span>
                        </div>
                      </div>
                      
                      {/* Silme Butonu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(product);
                        }}
                        style={{
                          background: '#fed7d7',
                          border: '1px solid #feb2b2',
                          borderRadius: '6px',
                          color: '#c53030',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginLeft: '10px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#feb2b2';
                          e.target.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#fed7d7';
                          e.target.style.color = '#c53030';
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  
                  {/* Yeni Ürün Ekle Butonu */}
                  <div 
                    onClick={() => {
                      setNewProduct({...newProduct, name: searchTerm});
                      setShowAddProduct(true);
                    }}
                    style={{
                      padding: '12px 15px',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      color: 'white',
                      fontWeight: '600',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    }}
                  >
                    ➕ "{searchTerm}" adında yeni ürün ekle
                  </div>
                </div>
              )}
              
              {/* Arama yapılmamışsa varsayılan yeni ürün ekleme butonu */}
              {!searchTerm && (
                <div style={{ marginTop: '15px' }}>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    style={{
                      width: '100%',
                      padding: '15px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px dashed #b8a082',
                      borderRadius: '12px',
                      background: 'transparent',
                      color: '#8b7355',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#faf8f5';
                      e.target.style.borderColor = '#8b7355';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.borderColor = '#b8a082';
                    }}
                  >
                    ➕ Listede olmayan ürün ekle
                  </button>
                </div>
              )}
              
              {/* Sonuç Bulunamadı */}
              {searchTerm && filteredProducts.length === 0 && (
                <div style={{
                  marginTop: '15px',
                  padding: '20px',
                  textAlign: 'center',
                  background: '#fef7f0',
                  borderRadius: '12px',
                  border: '1px solid #f4d5b7'
                }}>
                  <p style={{ 
                    margin: 0, 
                    color: '#9a6b3b', 
                    fontSize: '14px' 
                  }}>
                    "{searchTerm}" bulunamadı
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="progress">
              <div className="progress-bar" style={{ width: `${((currentProductIndex + 1) / products.length) * 100}%` }}></div>
            </div>
            
            {/* Ürün Bilgileri */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h3 style={{ color: '#4a5568', fontSize: '16px', margin: 0 }}>
                  Ürün {currentProductIndex + 1} / {products.length}
                </h3>
                <button
                  onClick={() => confirmDelete(currentProduct)}
                  style={{
                    background: '#fed7d7',
                    border: '1px solid #feb2b2',
                    borderRadius: '8px',
                    color: '#c53030',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#feb2b2';
                    e.target.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#fed7d7';
                    e.target.style.color = '#c53030';
                  }}
                >
                  🗑️ Sil
                </button>
              </div>
              <h2 style={{ color: '#2d3748', fontSize: '20px', marginBottom: '10px', lineHeight: '1.3' }}>
                {currentProduct.name}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          background: '#f7fafc', padding: '15px', borderRadius: '12px', marginBottom: '10px' }}>
                <span style={{ color: '#4a5568', fontSize: '14px' }}>Kategori:</span>
                <span style={{ color: '#2d3748', fontWeight: '600', fontSize: '14px' }}>
                  {currentProduct.category}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          background: '#f7fafc', padding: '15px', borderRadius: '12px' }}>
                <span style={{ color: '#4a5568', fontSize: '14px' }}>Beklenen Stok:</span>
                <span style={{ color: '#2d3748', fontWeight: '600', fontSize: '16px' }}>
                  {currentProduct.expectedStock} {currentProduct.unit}
                </span>
              </div>
            </div>
            
            {/* Sayım Girişi */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#2d3748', fontWeight: '600' }}>
                Mevcut Stok Miktarı:
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder={`Miktar (${currentProduct.unit})`}
                value={countValue}
                onChange={(e) => setCountValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '18px',
                  fontSize: '18px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            
            {/* Butonlar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {/* Geri Butonu */}
              {currentProductIndex > 0 && (
                <button onClick={goBack} style={{
                  flex: '1',
                  padding: '15px',
                  background: 'transparent',
                  border: '2px solid #4a5568',
                  borderRadius: '12px',
                  color: '#4a5568',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  ← Geri
                </button>
              )}
              
              {/* Atla Butonu */}
              <button onClick={skipProduct} style={{
                flex: '1',
                padding: '15px',
                background: 'transparent',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                color: '#f59e0b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}>
                Atla
              </button>
              
              {/* Sonraki Butonu - Sadece son ürün değilse göster */}
              {currentProductIndex < products.length - 1 && (
                <button onClick={handleCount} style={{
                  flex: '2',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}>
                  Sonraki →
                </button>
              )}
              
              {/* Tamamla Butonu - Her zaman görünür */}
              <button 
                onClick={() => {
                  if (countValue.trim()) {
                    // Önce mevcut ürünü kaydet, sonra tamamla
                    const currentProduct = products[currentProductIndex];
                    const actualCount = parseFloat(countValue) || 0;
                    const countedProduct = {
                      ...currentProduct,
                      actualCount,
                      countedAt: new Date().toISOString(),
                      skipped: false,
                      difference: actualCount - currentProduct.expectedStock
                    };
                    
                    setCountedProducts(prev => [...prev, countedProduct]);
                    saveCountResults();
                  } else {
                    // Direkt tamamla
                    saveCountResults();
                  }
                }}
                style={{
                  flex: currentProductIndex === products.length - 1 ? '2' : '1.5',
                  padding: '15px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✅ Tamamla
              </button>
            </div>
            
            {/* Hızlı Giriş Butonları */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#4a5568', fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>
                Hızlı Giriş:
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[0, 1, 5, 10, currentProduct.expectedStock].map(value => (
                  <button
                    key={value}
                    onClick={() => setCountValue(value.toString())}
                    style={{
                      padding: '8px 16px',
                      background: countValue === value.toString() ? '#4f46e5' : '#f7fafc',
                      color: countValue === value.toString() ? 'white' : '#4a5568',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '50px'
                    }}
                  >
                    {value === currentProduct.expectedStock ? 'Aynı' : value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="completed">
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
              <h2 style={{ color: '#2d3748', fontSize: '24px', marginBottom: '15px' }}>
                Sayım Admin Onayına Gönderildi!
              </h2>
              <p style={{ color: '#4a5568', fontSize: '16px', marginBottom: '30px' }}>
                {products.length} ürün sayımı admin onayı bekliyor
              </p>
              
              <div style={{
                background: '#e6fffa',
                border: '2px solid #38b2ac',
                borderRadius: '15px',
                padding: '20px',
                marginBottom: '30px'
              }}>
                <h3 style={{ color: '#234e52', margin: '0 0 10px 0', fontSize: '18px' }}>
                  ℹ️ Bilgilendirme
                </h3>
                <p style={{ color: '#285e61', margin: 0, fontSize: '14px' }}>
                  Sayımınız admin tarafından onaylandıktan sonra:<br/>
                  • 📊 Excel raporu otomatik oluşturulacak<br/>
                  • 📱 WhatsApp raporu hazırlanacak<br/>
                  • 📈 Stok veritabanı güncellenecek
                </p>
              </div>
              
              {/* Özet Bilgiler */}
              {countedProducts.length > 0 && (
                <div style={{ 
                  background: '#f7fafc', 
                  borderRadius: '15px', 
                  padding: '25px', 
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  <h3 style={{ color: '#2d3748', marginBottom: '15px', textAlign: 'center' }}>
                    Sayım Özeti
                  </h3>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Toplam Ürün:</span>
                      <strong>{countedProducts.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sayılan Ürün:</span>
                      <strong>{countedProducts.filter(p => !p.skipped).length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Atlanan Ürün:</span>
                      <strong>{countedProducts.filter(p => p.skipped).length}</strong>
                    </div>
                  </div>
                </div>
              )}
              
              {successMessage && (
                <div style={{
                  background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
                  border: '1px solid #28a745',
                  borderRadius: '12px',
                  color: '#155724',
                  padding: '15px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {successMessage}
                </div>
              )}
              
              <button
                onClick={onBack}
                style={{
                  padding: '15px 30px',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Ana Menüye Dön
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCount;
