import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import { db } from '../firebase/config';
import { ref, push, set, remove, get, onValue } from 'firebase/database';

const PersonelMaas = ({ onBack }) => {
  const [personeller, setPersoneller] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPersonel, setEditingPersonel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    ad: '',
    soyad: '',
    pozisyon: '',
    maas: '',
    baslamaTarihi: '',
    telefon: '',
    email: '',
    notlar: ''
  });

  useEffect(() => {
    // Personel verilerini Firebase'den çek
    const personelRef = ref(db, 'personeller');
    const unsubscribe = onValue(personelRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const personelList = Object.entries(data).map(([id, personel]) => ({
          id,
          ...personel
        }));
        setPersoneller(personelList);
      } else {
        setPersoneller([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.ad || !formData.soyad || !formData.maas) {
      setError('Ad, soyad ve maaş alanları zorunludur.');
      return;
    }

    try {
      const personelData = {
        ...formData,
        maas: parseFloat(formData.maas),
        kayitTarihi: new Date().toISOString(),
        aktif: true
      };

      if (editingPersonel) {
        // Güncelleme
        await set(ref(db, `personeller/${editingPersonel.id}`), personelData);
        setSuccess('Personel bilgileri güncellendi!');
      } else {
        // Yeni ekleme
        await push(ref(db, 'personeller'), personelData);
        setSuccess('Yeni personel eklendi!');
      }

      setShowModal(false);
      setEditingPersonel(null);
      setFormData({
        ad: '',
        soyad: '',
        pozisyon: '',
        maas: '',
        baslamaTarihi: '',
        telefon: '',
        email: '',
        notlar: ''
      });
    } catch (error) {
      setError('İşlem sırasında hata oluştu: ' + error.message);
    }
  };

  const handleEdit = (personel) => {
    setEditingPersonel(personel);
    setFormData({
      ad: personel.ad || '',
      soyad: personel.soyad || '',
      pozisyon: personel.pozisyon || '',
      maas: personel.maas?.toString() || '',
      baslamaTarihi: personel.baslamaTarihi || '',
      telefon: personel.telefon || '',
      email: personel.email || '',
      notlar: personel.notlar || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (personelId) => {
    if (window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
      try {
        await remove(ref(db, `personeller/${personelId}`));
        setSuccess('Personel silindi!');
      } catch (error) {
        setError('Silme işlemi sırasında hata oluştu: ' + error.message);
      }
    }
  };

  const toplamMaas = personeller.reduce((total, p) => total + (p.maas || 0), 0);

  const cardStyle = {
    backgroundColor: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "1.5rem"
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <Card style={cardStyle}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="mb-0" style={{ color: '#2d3748', fontWeight: '700' }}>
                  👥 Personel Maaş Yönetimi
                </h2>
                <Button 
                  variant="outline-secondary" 
                  onClick={onBack}
                  style={{ borderRadius: '10px' }}
                >
                  ← Ana Menü
                </Button>
              </div>
              
              <Row className="g-3">
                <Col md={3}>
                  <div className="text-center p-3" style={{ 
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h3 className="mb-1">{personeller.length}</h3>
                    <small>Toplam Personel</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3" style={{ 
                    background: 'linear-gradient(135deg, #059669, #0d9488)',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h3 className="mb-1">₺{toplamMaas.toLocaleString()}</h3>
                    <small>Toplam Maaş</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="text-center p-3" style={{ 
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    borderRadius: '15px',
                    color: 'white'
                  }}>
                    <h3 className="mb-1">₺{toplamMaas > 0 ? (toplamMaas / personeller.length).toFixed(0) : 0}</h3>
                    <small>Ortalama Maaş</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-grid">
                    <Button 
                      variant="success" 
                      onClick={() => {
                        setEditingPersonel(null);
                        setFormData({
                          ad: '', soyad: '', pozisyon: '', maas: '',
                          baslamaTarihi: '', telefon: '', email: '', notlar: ''
                        });
                        setShowModal(true);
                      }}
                      style={{ 
                        borderRadius: '15px',
                        fontWeight: '600',
                        height: '100%'
                      }}
                    >
                      ➕ Yeni Personel
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Personel Listesi */}
        <Row>
          <Col>
            <Card style={cardStyle}>
              <h4 className="mb-3" style={{ color: '#2d3748', fontWeight: '600' }}>
                📊 Personel Listesi
              </h4>
              
              {personeller.length === 0 ? (
                <div className="text-center py-5">
                  <h5 style={{ color: '#6b7280' }}>Henüz personel eklenmemiş</h5>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowModal(true)}
                    style={{ borderRadius: '10px' }}
                  >
                    İlk Personeli Ekle
                  </Button>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th>Ad Soyad</th>
                        <th>Pozisyon</th>
                        <th>Maaş</th>
                        <th>Başlama Tarihi</th>
                        <th>Telefon</th>
                        <th>Email</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personeller.map((personel) => (
                        <tr key={personel.id}>
                          <td style={{ fontWeight: '600' }}>
                            {personel.ad} {personel.soyad}
                          </td>
                          <td>
                            <span className="badge bg-primary" style={{ borderRadius: '8px' }}>
                              {personel.pozisyon || 'Belirtilmemiş'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600', color: '#059669' }}>
                            ₺{personel.maas?.toLocaleString() || 0}
                          </td>
                          <td>{personel.baslamaTarihi || '-'}</td>
                          <td>{personel.telefon || '-'}</td>
                          <td>{personel.email || '-'}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleEdit(personel)}
                                style={{ borderRadius: '8px' }}
                              >
                                ✏️
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDelete(personel.id)}
                                style={{ borderRadius: '8px' }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton style={{ background: '#f8fafc' }}>
            <Modal.Title>
              {editingPersonel ? '✏️ Personel Düzenle' : '➕ Yeni Personel Ekle'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: '#ffffff' }}>
            <Form onSubmit={handleSubmit}>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Ad *</Form.Label>
                    <Form.Control
                      type="text"
                      name="ad"
                      value={formData.ad}
                      onChange={handleInputChange}
                      required
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Soyad *</Form.Label>
                    <Form.Control
                      type="text"
                      name="soyad"
                      value={formData.soyad}
                      onChange={handleInputChange}
                      required
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Pozisyon</Form.Label>
                    <Form.Control
                      type="text"
                      name="pozisyon"
                      value={formData.pozisyon}
                      onChange={handleInputChange}
                      placeholder="Ör: Satış Temsilcisi"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Maaş (₺) *</Form.Label>
                    <Form.Control
                      type="number"
                      name="maas"
                      value={formData.maas}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Başlama Tarihi</Form.Label>
                    <Form.Control
                      type="date"
                      name="baslamaTarihi"
                      value={formData.baslamaTarihi}
                      onChange={handleInputChange}
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Telefon</Form.Label>
                    <Form.Control
                      type="tel"
                      name="telefon"
                      value={formData.telefon}
                      onChange={handleInputChange}
                      placeholder="0555 123 45 67"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ornek@email.com"
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Notlar</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="notlar"
                      value={formData.notlar}
                      onChange={handleInputChange}
                      placeholder="İsteğe bağlı notlar..."
                      style={{ borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Modal.Body>
          <Modal.Footer style={{ background: '#f8fafc' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowModal(false)}
              style={{ borderRadius: '8px' }}
            >
              İptal
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              style={{ borderRadius: '8px' }}
            >
              {editingPersonel ? 'Güncelle' : 'Kaydet'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </Container>
  );
};

export default PersonelMaas;
