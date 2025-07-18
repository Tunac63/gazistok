import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { ref, onValue, update, remove, set } from 'firebase/database';

function StockApproval({ onBack }) {
  const [pendingCounts, setPendingCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const pendingRef = ref(db, 'pendingStockCounts');
    const unsubscribe = onValue(pendingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const countsArray = Object.entries(data).map(([id, count]) => ({
          id,
          ...count
        }));
        setPendingCounts(countsArray.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
      } else {
        setPendingCounts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const approveCount = async (countId, countData) => {
    setProcessingId(countId);
    try {
      // Onaylanan sayımı stockCounts'a taşı
      const approvedData = {
        ...countData,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'admin'
      };
      
      await set(ref(db, `stockCounts/${countId}`), approvedData);
      
      // Bekleyen listeden kaldır
      await remove(ref(db, `pendingStockCounts/${countId}`));
      
      // Raporları oluştur
      generateReports(approvedData);
      
    } catch (error) {
      console.error('Onay hatası:', error);
      alert('Onay işlemi sırasında hata oluştu');
    }
    setProcessingId(null);
  };

  const rejectCount = async (countId) => {
    setProcessingId(countId);
    try {
      await remove(ref(db, `pendingStockCounts/${countId}`));
    } catch (error) {
      console.error('Reddetme hatası:', error);
      alert('Red işlemi sırasında hata oluştu');
    }
    setProcessingId(null);
  };

  const generateReports = (countData) => {
    // Excel raporu için veri hazırla
    generateExcelReport(countData);
    
    // WhatsApp raporu için veri hazırla
    generateWhatsAppReport(countData);
  };

  const generateExcelReport = (countData) => {
    const csvContent = [
      ['Ürün Adı', 'Kategori', 'Birim', 'Beklenen', 'Sayılan', 'Fark'],
      ...countData.products
        .filter(p => !p.skipped)
        .map(p => [
          p.name,
          p.category,
          p.unit,
          p.expectedStock,
          p.actualCount,
          p.difference
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stok_sayimi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateWhatsAppReport = (countData) => {
    const whatsappText = countData.products
      .filter(p => !p.skipped && p.actualCount > 0)
      .map(p => `${p.name}: ${p.actualCount} ${p.unit}`)
      .join('\n');

    const message = `📊 STOK SAYIM RAPORU\n🗓️ ${new Date().toLocaleDateString('tr-TR')}\n\n${whatsappText}`;
    
    // WhatsApp Web linkini aç
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '24px', marginBottom: '20px' }}>⏳</div>
        <p>Bekleyen sayımlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f7f1eb 0%, #ede4d3 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Back Button */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '25px',
          border: '1px solid #e8e5e5',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{ 
            color: '#2d3748', 
            margin: 0,
            fontSize: window.innerWidth <= 768 ? '20px' : '24px',
            fontWeight: '600'
          }}>
            📋 Stok Sayım Onayları
          </h1>
          <button
            onClick={onBack}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            <span>←</span> Geri
          </button>
        </div>

        {pendingCounts.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '60px',
            textAlign: 'center',
            border: '1px solid #e8e5e5'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h3 style={{ color: '#5a6c7d', marginBottom: '10px' }}>
              Bekleyen Sayım Yok
            </h3>
            <p style={{ color: '#8a8a8a' }}>
              Tüm stok sayımları onaylanmış durumda.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px' }}>
            {pendingCounts.map((count) => (
              <div
                key={count.id}
                style={{
                  background: 'white',
                  borderRadius: '15px',
                  padding: '25px',
                  border: '1px solid #e8e5e5',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '20px'
                }}>
                  <div>
                    <h3 style={{ color: '#2d3748', margin: '0 0 10px 0' }}>
                      Stok Sayımı #{count.id.slice(-6)}
                    </h3>
                    <div style={{ color: '#4a5568', fontSize: '14px' }}>
                      <p style={{ margin: '5px 0' }}>
                        👤 Sayım Yapan: {count.countedBy}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        📅 Tarih: {new Date(count.submittedAt).toLocaleString('tr-TR')}
                      </p>
                      <p style={{ margin: '5px 0' }}>
                        📦 Toplam Ürün: {count.totalProducts}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => rejectCount(count.id)}
                      disabled={processingId === count.id}
                      style={{
                        background: '#fed7d7',
                        border: '1px solid #feb2b2',
                        borderRadius: '8px',
                        color: '#c53030',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: processingId === count.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === count.id ? 0.6 : 1
                      }}
                    >
                      {processingId === count.id ? '⏳' : '❌'} Reddet
                    </button>
                    
                    <button
                      onClick={() => approveCount(count.id, count)}
                      disabled={processingId === count.id}
                      style={{
                        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: processingId === count.id ? 'not-allowed' : 'pointer',
                        opacity: processingId === count.id ? 0.6 : 1
                      }}
                    >
                      {processingId === count.id ? '⏳' : '✅'} Onayla & Rapor
                    </button>
                  </div>
                </div>

                {/* Ürün Listesi */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '16px' }}>
                    Sayım Detayları
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {count.products?.filter(p => !p.skipped).map((product, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'white',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '5px' }}>
                          {product.name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                          <span>Beklenen: {product.expectedStock}</span>
                          <span>Sayılan: {product.actualCount}</span>
                          <span style={{ 
                            color: product.difference > 0 ? '#38a169' : product.difference < 0 ? '#e53e3e' : '#4a5568',
                            fontWeight: '600'
                          }}>
                            Fark: {product.difference > 0 ? '+' : ''}{product.difference}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Özet */}
                {count.summary && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    marginTop: '15px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
                        {count.summary.totalItems}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>Sayılan Ürün</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
                        {count.summary.totalExpected}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>Beklenen Toplam</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#2d3748' }}>
                        {count.summary.totalActual}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>Sayılan Toplam</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: '600', 
                        color: count.summary.totalDifference > 0 ? '#38a169' : count.summary.totalDifference < 0 ? '#e53e3e' : '#4a5568'
                      }}>
                        {count.summary.totalDifference > 0 ? '+' : ''}{count.summary.totalDifference}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4a5568' }}>Toplam Fark</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StockApproval;
