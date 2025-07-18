// src/pages/StaffList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { ref, onValue, set, remove, push, get } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';
import * as XLSX from 'xlsx';
import StaffTable from './StaffTable';
import { useToast } from '../components/Toast';

const StaffList = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [filterType, setFilterType] = useState('active'); // 'active', 'inactive', 'all'
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [staffAdded, setStaffAdded] = useState(false); // Personel eklenip eklenmediğini takip et
  const [viewMode, setViewMode] = useState('table'); // 'cards' veya 'table' - varsayılan tablo
  const [showExitDateModal, setShowExitDateModal] = useState(false);
  const [exitingStaff, setExitingStaff] = useState(null);
  const [exitDate, setExitDate] = useState('');
  
  // Toast sistemi
  const { showSuccess, showError, showWarning, showInfo, ToastComponent } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    workArea: 'Salon',
    position: '',
    startDate: '',
    sgkStartDate: '',
    phone: '',
    email: '',
    isActive: true,
    exitDate: ''
  });

  const areas = ['Salon', 'Bar', 'Mutfak', 'Yönetim'];
  const positions = {
    'Yönetim': ['Müdür'],
    'Salon': ['Servis Personeli', 'Salon Şefi'],
    'Bar': ['Barista', 'Bar Şefi'],
    'Mutfak': ['Mutfak Personeli', 'Mutfak Şefi', 'Bulaşıkçı']
  };

  useEffect(() => {
    loadStaffList();
    checkAdminStatus();
    
    // URL parametresinden görünüm modunu kontrol et
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('view');
    if (mode === 'cards') {
      setViewMode('cards');
    }
  }, [user]);

  const checkAdminStatus = async () => {
    console.log('🔍 Admin kontrolü başlatılıyor...');
    console.log('👤 Kullanıcı:', user);
    
    if (user) {
      console.log('🔑 User UID:', user.uid);
      
      // Basit admin kontrolü - email bazlı
      const adminEmails = ['gazi@admin.com', 'admin@gazi.com', user.email]; // Geçici olarak kendi emailinizi de admin yapıyoruz
      const isEmailAdmin = adminEmails.includes(user.email);
      
      console.log('📧 User email:', user.email);
      console.log('🔐 Email admin mi?', isEmailAdmin);
      
      // Firebase'den de kontrol et
      const adminRef = ref(db, `admins/${user.uid}`);
      onValue(adminRef, (snapshot) => {
        const isFirebaseAdmin = snapshot.exists();
        console.log('🔥 Firebase admin mi?', isFirebaseAdmin);
        console.log('📊 Firebase data:', snapshot.val());
        
        // Email admin ise veya Firebase'de admin ise
        const finalAdminStatus = isEmailAdmin || isFirebaseAdmin;
        console.log('✅ Final admin durumu:', finalAdminStatus);
        setIsAdmin(finalAdminStatus);
      });
    } else {
      console.log('❌ Kullanıcı giriş yapmamış');
      setIsAdmin(false);
    }
  };

  const loadStaffList = () => {
    const staffRef = ref(db, 'staff');
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const staffArray = Object.entries(data).map(([id, staff]) => ({
          id,
          ...staff
        })).sort((a, b) => a.name.localeCompare(b.name));
        setStaffList(staffArray);
      } else {
        setStaffList([]);
      }
      setLoading(false);
    });
  };

  // Excel'deki personelleri otomatik ekle
  const addInitialStaff = async () => {
    if (!user) return;
    
    try {
      // Önce mevcut personel sayısını kontrol et
      const staffRef = ref(db, 'staff');
      const snapshot = await get(staffRef);
      
      // Eğer zaten 5'den fazla personel varsa ekleme
      if (snapshot.exists() && Object.keys(snapshot.val()).length > 5) {
        console.log('Zaten personel mevcut, otomatik ekleme iptal edildi');
        return;
      }

      const staffData = [
        {
          name: 'AHMET TUNAHAN',
          surname: 'ÖZTÜRK',
          sgkStartDate: '2025-05-15',
          startDate: '2025-05-15',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'AYŞEGÜL',
          surname: 'ÖZÇELİK',
          sgkStartDate: '2025-06-17',
          startDate: '2025-06-11',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'EZGİ SU',
          surname: 'ARSLAN',
          sgkStartDate: '2025-06-20',
          startDate: '2025-06-18',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'HATUN',
          surname: 'AYDIN',
          sgkStartDate: '2025-05-15',
          startDate: '2025-05-15',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'İREM',
          surname: 'BEKTAŞ',
          sgkStartDate: '2025-06-17',
          startDate: '2025-06-10',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'LEYLA HATUN',
          surname: 'CANSEV',
          sgkStartDate: '2025-06-18',
          startDate: '2025-06-01',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'SABAHAT',
          surname: 'SUNGUR',
          sgkStartDate: '2025-06-17',
          startDate: '2025-06-15',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'SİLA',
          surname: 'ÇETİNKAYA',
          sgkStartDate: '2025-05-15',
          startDate: '2025-05-15',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'ZEYNEP',
          surname: 'YILMAZ',
          sgkStartDate: '2025-06-18',
          startDate: '2025-06-17',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'BENGÜ SUDE',
          surname: 'ÖZBEN',
          sgkStartDate: '2025-05-18',
          startDate: '2025-05-18',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'HÜLYA',
          surname: 'ÇETİN',
          sgkStartDate: '2025-06-01',
          startDate: '2025-06-01',
          workArea: 'Salon',
          position: 'Garson'
        },
        {
          name: 'ÇİĞDEM',
          surname: 'GÜLEÇ',
          sgkStartDate: '2025-05-15',
          startDate: '2025-05-15',
          workArea: 'Salon',
          position: 'Garson'
        }
      ];

      console.log('🚀 Otomatik personel ekleme başlatılıyor...');
      
      for (const staff of staffData) {
        const newStaffRef = push(ref(db, 'staff'));
        const processedData = {
          name: staff.name,
          surname: staff.surname,
          fullName: `${staff.name} ${staff.surname}`,
          workArea: staff.workArea,
          position: staff.position,
          startDate: staff.startDate,
          sgkStartDate: staff.sgkStartDate,
          phone: '',
          email: '',
          isActive: true,
          createdAt: Date.now()
        };
        
        await set(newStaffRef, processedData);
        console.log(`✅ ${staff.name} ${staff.surname} eklendi`);
      }
      
      console.log('🎉 12 personel başarıyla eklendi!');
    } catch (error) {
      console.error('❌ Otomatik personel ekleme hatası:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      surname: '',
      workArea: 'Salon',
      position: '',
      startDate: '',
      sgkStartDate: '',
      phone: '',
      email: '',
      isActive: true,
      exitDate: ''
    });
    setEditingStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.surname.trim()) {
      showWarning('Ad ve soyad alanları zorunludur!');
      return;
    }

    try {
      const staffData = {
        ...formData,
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        fullName: `${formData.name.trim()} ${formData.surname.trim()}`,
        createdAt: editingStaff ? editingStaff.createdAt : Date.now(),
        updatedAt: Date.now()
      };

      if (editingStaff) {
        await set(ref(db, `staff/${editingStaff.id}`), staffData);
        showSuccess('Personel bilgileri güncellendi!');
      } else {
        await push(ref(db, 'staff'), staffData);
        showSuccess('Yeni personel eklendi!');
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showError('Kaydetme sırasında hata oluştu: ' + error.message);
    }
  };

  const handleEdit = (staff) => {
    setFormData({
      name: staff.name || '',
      surname: staff.surname || '',
      workArea: staff.workArea || 'Salon',
      position: staff.position || '',
      startDate: staff.startDate || '',
      sgkStartDate: staff.sgkStartDate || '',
      phone: staff.phone || '',
      email: staff.email || '',
      isActive: staff.isActive !== false,
      exitDate: staff.exitDate || ''
    });
    setEditingStaff(staff);
    setShowAddModal(true);
  };

  const handleDelete = async (staffId, staffName) => {
    if (window.confirm(`${staffName} adlı personeli silmek istediğinize emin misiniz?`)) {
      try {
        await remove(ref(db, `staff/${staffId}`));
        showSuccess('Personel silindi!');
      } catch (error) {
        console.error('Silme hatası:', error);
        showError('Silme sırasında hata oluştu: ' + error.message);
      }
    }
  };

  // İşten çıkarma onayı
  const handleExitConfirm = async () => {
    if (!exitDate.trim()) {
      showWarning('İşten çıkış tarihi girilmeden işlem iptal edildi!');
      return;
    }

    // Tarihi doğrula - hem / hem . kabul et
    const datePattern = /^\d{2}[\/\.]\d{2}[\/\.]\d{4}$/;
    if (!datePattern.test(exitDate)) {
      showError('Geçerli bir tarih formatı girin!\nÖrnekler: 18/07/2025 veya 18.07.2025');
      return;
    }

    try {
      // Tarihi ISO formatına çevir - hem / hem . destekle
      const [day, month, year] = exitDate.split(/[\/\.]/);
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

      await set(ref(db, `staff/${exitingStaff.id}`), {
        ...exitingStaff,
        isActive: false,
        exitDate: isoDate
      });
      
      // Detaylı işten çıkarma bildirimi
      const startDate = new Date(exitingStaff.startDate);
      const exitDateObj = new Date(isoDate);
      const workDays = Math.ceil((exitDateObj - startDate) / (1000 * 60 * 60 * 24));
      const workYears = Math.floor(workDays / 365);
      const workMonths = Math.floor((workDays % 365) / 30);
      const remainingDays = workDays % 30;
      
      let durationText = '';
      if (workYears > 0) durationText += `${workYears} yıl `;
      if (workMonths > 0) durationText += `${workMonths} ay `;
      if (remainingDays > 0) durationText += `${remainingDays} gün`;
      if (!durationText) durationText = '1 günden az';

      const notificationMessage = `🔴 PERSONEL İŞTEN ÇIKTI\n\n` +
        `👤 Personel: ${exitingStaff.fullName}\n` +
        `📋 Pozisyon: ${exitingStaff.position || 'Belirtilmemiş'}\n` +
        `🏢 Çalışma Alanı: ${exitingStaff.workArea}\n` +
        `📅 Giriş Tarihi: ${new Date(exitingStaff.startDate).toLocaleDateString('tr-TR')}\n` +
        `📅 Çıkış Tarihi: ${exitDate}\n` +
        `⏱️ Çalışma Süresi: ${durationText}\n` +
        `📝 Durum: İşten çıkarıldı`;

      showError(notificationMessage);
      setShowExitDateModal(false);
      setExitingStaff(null);
      setExitDate('');
    } catch (error) {
      console.error('İşten çıkarma hatası:', error);
      showError('İşlem sırasında hata oluştu: ' + error.message);
    }
  };

  const toggleStatus = async (staff) => {
    try {
      if (staff.isActive) {
        // İşten çıkarma - modal aç
        setExitingStaff(staff);
        const today = new Date();
        const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        setExitDate(formattedDate);
        setShowExitDateModal(true);
      } else {
        // Tekrar işe alma - çıkış tarihini temizle
        const updatedStaff = { ...staff };
        delete updatedStaff.exitDate;
        
        await set(ref(db, `staff/${staff.id}`), {
          ...updatedStaff,
          isActive: true
        });
        
        // Detaylı tekrar işe alma bildirimi
        let separationMessage = '';
        if (staff.exitDate) {
          const exitDateObj = new Date(staff.exitDate);
          const currentDate = new Date();
          const exitDuration = Math.ceil((currentDate - exitDateObj) / (1000 * 60 * 60 * 24));
          
          const sepYears = Math.floor(exitDuration / 365);
          const sepMonths = Math.floor((exitDuration % 365) / 30);
          const sepDays = exitDuration % 30;
          
          let sepText = '';
          if (sepYears > 0) sepText += `${sepYears} yıl `;
          if (sepMonths > 0) sepText += `${sepMonths} ay `;
          if (sepDays > 0) sepText += `${sepDays} gün`;
          if (!sepText) sepText = '1 günden az';
          
          separationMessage = `⏳ Ayrılık Süresi: ${sepText}\n`;
        }

        const notificationMessage = `🟢 PERSONEL TEKRAR İŞE ALINDI\n\n` +
          `👤 Personel: ${staff.fullName}\n` +
          `📋 Pozisyon: ${staff.position || 'Belirtilmemiş'}\n` +
          `🏢 Çalışma Alanı: ${staff.workArea}\n` +
          `📅 Tekrar İşe Alınma: ${new Date().toLocaleDateString('tr-TR')}\n` +
          separationMessage +
          `📝 Durum: Aktif personel`;

        showSuccess(notificationMessage);
      }
    } catch (error) {
      console.error('Durum değiştirme hatası:', error);
      showError('İşlem sırasında hata oluştu: ' + error.message);
    }
  };

  // Filtrelenmiş personel listesi
  const getFilteredStaff = () => {
    switch (filterType) {
      case 'active':
        return staffList.filter(staff => staff.isActive !== false);
      case 'inactive':
        return staffList.filter(staff => staff.isActive === false);
      case 'all':
        return staffList;
      default:
        return staffList.filter(staff => staff.isActive !== false);
    }
  };

  const exportToExcel = () => {
    const filteredData = getFilteredStaff();
    const csvContent = [
      ['Ad', 'Soyad', 'Çalışma Alanı', 'Pozisyon', 'İşe Giriş', 'SGK Başlama', 'Telefon', 'E-posta', 'Durum'],
      ...filteredData.map(staff => [
        staff.name || '',
        staff.surname || '',
        staff.workArea || '',
        staff.position || '',
        staff.startDate || '',
        staff.sgkStartDate || '',
        staff.phone || '',
        staff.email || '',
        staff.isActive ? 'Aktif' : 'Ayrılan'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personel_listesi_${filterType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToWhatsApp = () => {
    const filteredData = getFilteredStaff();
    let message = `👥 PERSONEL LİSTESİ\n📅 ${new Date().toLocaleDateString('tr-TR')}\n📊 Durum: ${filterType === 'active' ? 'Aktif Çalışanlar' : filterType === 'inactive' ? 'Ayrılan Personel' : 'Tüm Personel'}\n\n`;
    
    areas.forEach(area => {
      const areaStaff = filteredData.filter(staff => staff.workArea === area);
      if (areaStaff.length > 0) {
        message += `🏢 ${area.toUpperCase()}\n`;
        areaStaff.forEach(staff => {
          const statusIcon = staff.isActive ? '✅' : '❌';
          message += `  ${statusIcon} ${staff.fullName} (${staff.position})\n`;
          if (staff.phone) message += `    📞 ${staff.phone}\n`;
        });
        message += '\n';
      }
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Excel Import Functions
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Excel verilerini uygun formata çevir
        const processedData = jsonData.map((row, index) => {
          // İsim Soyisim'i ayır
          const fullName = row['İsim Soyisim'] || row['İsim'] || row['Ad Soyad'] || row['Name'] || '';
          const nameParts = fullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          return {
            id: index + 1,
            name: firstName,
            surname: lastName,
            workArea: row['Çalışma Alanı'] || row['Alan'] || row['Bölüm'] || 'Salon', // Varsayılan alan
            position: row['Pozisyon'] || row['Görev'] || row['Position'] || '', // Boş bırakılabilir
            startDate: formatDate(row['Gerçek Giriş'] || row['İşe Giriş Tarihi'] || row['Başlangıç'] || row['Start Date']),
            sgkStartDate: formatDate(row['SGK Giriş'] || row['SGK Tarihi'] || row['SGK'] || row['SGK Start']),
            phone: row['Telefon'] || row['Phone'] || '', // Boş bırakılabilir
            email: row['Email'] || row['E-posta'] || '', // Boş bırakılabilir
            isActive: true,
            originalRow: row
          };
        });

        setImportData(processedData);
        setShowImportModal(true);
      } catch (error) {
        console.error('Excel okuma hatası:', error);
        showError('Excel dosyası okunamadı. Lütfen geçerli bir Excel dosyası seçin.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    
    // Excel serial date kontrol
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    if (typeof dateValue === 'string') {
      // DD.MM.YYYY formatını kontrol et
      if (dateValue.includes('.')) {
        const parts = dateValue.split('.');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          // YYYY-MM-DD formatına çevir
          return `${year}-${month}-${day}`;
        }
      }
      
      // Diğer tarih formatlarını parse et
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return '';
  };

  const importStaffData = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    try {
      for (const staffData of importData) {
        const staffRef = push(ref(db, 'staff'));
        const processedData = {
          name: staffData.name,
          surname: staffData.surname,
          fullName: `${staffData.name} ${staffData.surname}`,
          workArea: staffData.workArea,
          position: staffData.position,
          startDate: staffData.startDate,
          sgkStartDate: staffData.sgkStartDate,
          phone: staffData.phone,
          email: staffData.email,
          isActive: staffData.isActive,
          createdAt: Date.now()
        };
        
        await set(staffRef, processedData);
      }
      
      showSuccess(`${importData.length} personel başarıyla eklendi!`);
      setShowImportModal(false);
      setImportData([]);
    } catch (error) {
      console.error('İmport hatası:', error);
      showError('Personel eklenirken hata oluştu: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Çift personelleri temizle
  const removeDuplicateStaff = async () => {
    if (!isAdmin) {
      showWarning('Bu işlem için admin yetkisi gereklidir!');
      return;
    }

    if (!window.confirm('Çift personelleri temizlemek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const staffRef = ref(db, 'staff');
      const snapshot = await get(staffRef);
      
      if (!snapshot.exists()) return;

      const allStaff = Object.entries(snapshot.val()).map(([id, staff]) => ({
        id,
        ...staff
      }));

      // İsim-soyisime göre gruplama
      const nameGroups = {};
      allStaff.forEach(staff => {
        const key = `${staff.name} ${staff.surname}`.toLowerCase();
        if (!nameGroups[key]) {
          nameGroups[key] = [];
        }
        nameGroups[key].push(staff);
      });

      // Çift olanları sil (en eski olanı bırak)
      let deletedCount = 0;
      for (const [name, staffGroup] of Object.entries(nameGroups)) {
        if (staffGroup.length > 1) {
          // En eski olanı bırak, diğerlerini sil
          const sortedByDate = staffGroup.sort((a, b) => a.createdAt - b.createdAt);
          const toDelete = sortedByDate.slice(1); // İlki hariç hepsini sil
          
          for (const staff of toDelete) {
            await remove(ref(db, `staff/${staff.id}`));
            deletedCount++;
            console.log(`🗑️ ${staff.name} ${staff.surname} (${staff.id}) silindi`);
          }
        }
      }

      showSuccess(`${deletedCount} çift personel temizlendi!`);
    } catch (error) {
      console.error('Temizleme hatası:', error);
      showError('Temizleme sırasında hata oluştu: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Personel listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Eğer tablo modu seçildiyse StaffTable componenti göster
  if (viewMode === 'table') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
        padding: window.innerWidth <= 768 ? '15px' : '20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: window.innerWidth <= 768 ? '20px' : '30px',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
            gap: '15px'
          }}>
            <div>
              <button
                onClick={() => navigate('/staff-management')}
                style={{
                  background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#8B4513',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '15px'
                }}
              >
                ← Geri
              </button>
              <h1 style={{ 
                color: '#2d3748', 
                margin: 0,
                fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                fontWeight: '700'
              }}>
                📊 Personel Listesi - Tablo Görünümü
              </h1>
              <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>
                Toplam {staffList.length} personel • {staffList.filter(s => s.isActive).length} aktif • {staffList.filter(s => s.isActive === false).length} ayrılan
              </p>
              
              {/* Filter Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '15px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setFilterType('active')}
                  style={{
                    background: filterType === 'active' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#e5e7eb',
                    color: filterType === 'active' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ✅ Aktifler ({staffList.filter(s => s.isActive).length})
                </button>
                
                <button
                  onClick={() => setFilterType('inactive')}
                  style={{
                    background: filterType === 'inactive' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#e5e7eb',
                    color: filterType === 'inactive' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ❌ Ayrılanlar ({staffList.filter(s => s.isActive === false).length})
                </button>
                
                <button
                  onClick={() => setFilterType('all')}
                  style={{
                    background: filterType === 'all' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#e5e7eb',
                    color: filterType === 'all' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  📋 Tümü ({staffList.length})
                </button>
              </div>
            </div>
            
            <div>
              <button
                onClick={() => {
                  if (!isAdmin) {
                    showWarning('Bu işlem için admin yetkisi gereklidir!');
                    return;
                  }
                  resetForm();
                  setShowAddModal(true);
                }}
                style={{
                  background: isAdmin 
                    ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                    : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isAdmin ? 'pointer' : 'not-allowed',
                  opacity: isAdmin ? 1 : 0.6,
                  marginBottom: window.innerWidth <= 768 ? '10px' : '0'
                }}
              >
                {isAdmin ? '➕ Yeni Personel' : '🔒 Yeni Personel'}
              </button>
            </div>
          </div>

          {/* Görünüm Seçici - Excel/WhatsApp butonlarının altına */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '15px',
            marginBottom: '20px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'default',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📊 Tablo Görünümü
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🃏 Kart Görünümü
            </button>
          </div>

          {/* Staff Table Container */}
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
            overflow: 'auto'
          }}>
            {getFilteredStaff().length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#374151' }}>
                  {filterType === 'active' && 'Aktif Personel Bulunamadı'}
                  {filterType === 'inactive' && 'Ayrılan Personel Bulunamadı'}
                  {filterType === 'all' && 'Henüz Personel Eklenmemiş'}
                </h3>
              </div>
            ) : (
              <StaffTable 
                staffList={staffList}
                isAdmin={isAdmin}
                filterType={filterType}
                onEdit={handleEdit}
                onToggleStatus={toggleStatus}
                onDelete={handleDelete}
                onViewModeChange={setViewMode}
                showWarning={showWarning}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
      padding: window.innerWidth <= 768 ? '15px' : '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: window.innerWidth <= 768 ? '20px' : '30px',
          marginBottom: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
          gap: '15px'
        }}>
          <div>
            <button
              onClick={() => navigate('/staff-management')}
              style={{
                background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#8B4513',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              ← Geri
            </button>
            <h1 style={{ 
              color: '#2d3748', 
              margin: 0,
              fontSize: window.innerWidth <= 768 ? '20px' : '24px',
              fontWeight: '700'
            }}>
              👥 Personel Listesi
            </h1>
            <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>
              Toplam {staffList.length} personel • {staffList.filter(s => s.isActive).length} aktif • {staffList.filter(s => s.isActive === false).length} ayrılan
            </p>
            
            {/* Filter Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginTop: '15px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setFilterType('active')}
                style={{
                  background: filterType === 'active' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#e5e7eb',
                  color: filterType === 'active' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ✅ Aktif Çalışanlar ({staffList.filter(s => s.isActive).length})
              </button>
              
              <button
                onClick={() => setFilterType('inactive')}
                style={{
                  background: filterType === 'inactive' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : '#e5e7eb',
                  color: filterType === 'inactive' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ❌ Ayrılanlar ({staffList.filter(s => s.isActive === false).length})
              </button>
              
              <button
                onClick={() => setFilterType('all')}
                style={{
                  background: filterType === 'all' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#e5e7eb',
                  color: filterType === 'all' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📋 Tümü ({staffList.length})
              </button>
            </div>
          </div>
          
          <div>
            <button
              onClick={() => {
                if (!isAdmin) {
                  showWarning('🔒 Bu işlem için admin yetkisi gereklidir!');
                  return;
                }
                resetForm();
                setShowAddModal(true);
              }}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.6
              }}
            >
              {isAdmin ? '+ Yeni Personel Ekle' : '🔒 Yeni Personel Ekle'}
            </button>
            
            {/* Excel Import Button - Smaller and below */}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
              disabled={!isAdmin}
            />
            <button
              onClick={() => {
                if (!isAdmin) {
                  showWarning('Bu işlem için admin yetkisi gereklidir!');
                  return;
                }
                document.getElementById('excel-upload').click();
              }}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.6,
                marginTop: '8px',
                display: 'block'
              }}
            >
              {isAdmin ? '📊 Excel\'den İçe Aktar' : '🔒 Excel\'den İçe Aktar'}
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => {
              if (!isAdmin) {
                showWarning('Bu işlem için admin yetkisi gereklidir!');
                return;
              }
              exportToExcel();
            }}
            style={{
              background: isAdmin 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.6
            }}
          >
            {isAdmin ? '📊 Excel İndir' : '🔒 Excel İndir'}
          </button>
          <button
            onClick={() => {
              if (!isAdmin) {
                showWarning('Bu işlem için admin yetkisi gereklidir!');
                return;
              }
              exportToWhatsApp();
            }}
            style={{
              background: isAdmin 
                ? 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)'
                : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.6
            }}
          >
            {isAdmin ? '📱 WhatsApp Gönder' : '🔒 WhatsApp Gönder'}
          </button>
          
          {/* Duplicate Cleanup Button */}
          <button
            onClick={() => {
              if (!isAdmin) {
                showWarning('Bu işlem için admin yetkisi gereklidir!');
                return;
              }
              removeDuplicateStaff();
            }}
            style={{
              background: isAdmin 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.6
            }}
          >
            {isAdmin ? '🧹 Çiftleri Temizle' : '🔒 Çiftleri Temizle'}
          </button>
        </div>

        {/* Görünüm Seçici - Excel/WhatsApp butonlarının altına */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '15px',
          marginBottom: '20px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setViewMode('table')}
            style={{
              background: viewMode === 'table' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : '#f1f5f9',
              color: viewMode === 'table' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📊 Tablo Görünümü
          </button>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              background: viewMode === 'cards' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#f1f5f9',
              color: viewMode === 'cards' ? 'white' : '#475569',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🃏 Kart Görünümü
          </button>
        </div>

        {/* Staff List */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {getFilteredStaff().length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              background: 'white',
              borderRadius: '20px',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 8px 25px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                {filterType === 'active' ? '👥' : filterType === 'inactive' ? '📋' : '📂'}
              </div>
              <h3 style={{ color: '#64748b', marginBottom: '10px' }}>
                {filterType === 'active' && 'Aktif Personel Bulunamadı'}
                {filterType === 'inactive' && 'Ayrılan Personel Bulunamadı'}
                {filterType === 'all' && 'Henüz Personel Eklenmemiş'}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                {filterType === 'active' && 'Henüz aktif çalışan personel bulunmamaktadır.'}
                {filterType === 'inactive' && 'Ayrılan personel bulunmamaktadır.'}
                {filterType === 'all' && 'Personel eklemek için yukarıdaki butonu kullanın.'}
              </p>
            </div>
          ) : (
            getFilteredStaff().map(staff => (
            <div
              key={staff.id}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '25px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                border: `3px solid ${staff.isActive ? '#e2e8f0' : '#fed7d7'}`,
                opacity: staff.isActive ? 1 : 0.7,
                transition: 'all 0.3s ease'
              }}
            >
              {/* Staff Header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h3 style={{ 
                    color: '#2d3748', 
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '700'
                  }}>
                    {staff.fullName || `${staff.name} ${staff.surname}`}
                  </h3>
                  <span style={{
                    background: staff.isActive 
                      ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {staff.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '15px'
                }}>
                  <div style={{ color: '#4f46e5', fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
                    🏢 {staff.workArea}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '13px' }}>
                    {staff.position}
                  </div>
                </div>
              </div>

              {/* Staff Details */}
              <div style={{ marginBottom: '20px' }}>
                {staff.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', minWidth: '100px' }}>🗓️ İşe Giriş:</span>
                    <span style={{ color: '#2d3748', fontSize: '13px', fontWeight: '600' }}>
                      {new Date(staff.startDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                )}
                
                {/* Çıkış Tarihi - Sadece pasif personel için */}
                {!staff.isActive && staff.exitDate && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', minWidth: '100px' }}>🚪 İşten Çıkış:</span>
                    <span style={{ 
                      color: '#dc2626', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      background: '#fee2e2',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {new Date(staff.exitDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                )}
                
                <div style={{ 
                  background: staff.sgkStartDate ? 'linear-gradient(135deg, #e8f5e8 0%, #f0f9ff 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '10px',
                  border: staff.sgkStartDate ? '1px solid #22c55e' : '1px solid #f59e0b'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ 
                        color: staff.sgkStartDate ? '#166534' : '#92400e', 
                        fontSize: '13px', 
                        fontWeight: '600',
                        display: 'block',
                        marginBottom: '2px'
                      }}>
                        🏥 SGK Bilgisi
                      </span>
                      <span style={{ 
                        color: staff.sgkStartDate ? '#166534' : '#92400e', 
                        fontSize: '12px'
                      }}>
                        {staff.sgkStartDate 
                          ? `Başlama: ${new Date(staff.sgkStartDate).toLocaleDateString('tr-TR')}`
                          : 'SGK tarihi henüz girilmemiş'
                        }
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (!isAdmin) {
                          showWarning('Bu işlem için admin yetkisi gereklidir!');
                          return;
                        }
                        handleEdit(staff);
                      }}
                      style={{
                        background: isAdmin 
                          ? (staff.sgkStartDate ? 'rgba(22, 101, 52, 0.1)' : 'rgba(146, 64, 14, 0.1)')
                          : 'rgba(160, 160, 160, 0.1)',
                        border: isAdmin 
                          ? `1px solid ${staff.sgkStartDate ? '#22c55e' : '#f59e0b'}`
                          : '1px solid #a0a0a0',
                        borderRadius: '6px',
                        color: isAdmin 
                          ? (staff.sgkStartDate ? '#166534' : '#92400e')
                          : '#a0a0a0',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: isAdmin ? 'pointer' : 'not-allowed',
                        opacity: isAdmin ? 1 : 0.6
                      }}
                    >
                      {isAdmin 
                        ? (staff.sgkStartDate ? '✏️ Düzenle' : '📝 Ekle')
                        : '🔒 ' + (staff.sgkStartDate ? 'Düzenle' : 'Ekle')
                      }
                    </button>
                  </div>
                </div>

                {staff.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', minWidth: '100px' }}>📞 Telefon:</span>
                    <span style={{ color: '#2d3748', fontSize: '13px', fontWeight: '600' }}>
                      {staff.phone}
                    </span>
                  </div>
                )}

                {staff.email && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '13px', minWidth: '100px' }}>✉️ E-posta:</span>
                    <span style={{ color: '#2d3748', fontSize: '13px', fontWeight: '600' }}>
                      {staff.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    if (!isAdmin) {
                      showWarning('Bu işlem için admin yetkisi gereklidir!');
                      return;
                    }
                    handleEdit(staff);
                  }}
                  style={{
                    background: isAdmin 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                      : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.6,
                    flex: 1
                  }}
                >
                  {isAdmin ? '✏️ Düzenle' : '🔒 Düzenle'}
                </button>
                
                <button
                  onClick={() => {
                    if (!isAdmin) {
                      showWarning('Bu işlem için admin yetkisi gereklidir!');
                      return;
                    }
                    toggleStatus(staff);
                  }}
                  style={{
                    background: isAdmin 
                      ? (staff.isActive 
                          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          : 'linear-gradient(135deg, #10b981 0%, #059669 100%)')
                      : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.6,
                    flex: 1
                  }}
                >
                  {isAdmin 
                    ? (staff.isActive ? '🚪 İşten Çıkar' : '🔄 Tekrar İşe Al')
                    : '🔒 ' + (staff.isActive ? 'İşten Çıkar' : 'Tekrar İşe Al')
                  }
                </button>
                
                <button
                  onClick={() => {
                    if (!isAdmin) {
                      showWarning('Bu işlem için admin yetkisi gereklidir!');
                      return;
                    }
                    handleDelete(staff.id, staff.fullName);
                  }}
                  style={{
                    background: isAdmin 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.6
                  }}
                >
                  {isAdmin ? '🗑️' : '🔒'}
                </button>
              </div>
            </div>
          )))}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '20px' : '30px',
              maxWidth: '500px',
              width: window.innerWidth <= 768 ? '95%' : '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{ color: '#2d3748', marginBottom: '20px', fontSize: '20px', fontWeight: '700' }}>
                {editingStaff ? '✏️ Personel Düzenle' : '👤 Yeni Personel Ekle'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', 
                    gap: '10px' 
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        Ad *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        Soyad *
                      </label>
                      <input
                        type="text"
                        value={formData.surname}
                        onChange={(e) => setFormData({...formData, surname: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Çalışma Alanı
                    </label>
                    <select
                      value={formData.workArea}
                      onChange={(e) => setFormData({...formData, workArea: e.target.value, position: ''})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px'
                      }}
                    >
                      {areas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Pozisyon
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Seçiniz</option>
                      {positions[formData.workArea]?.map(position => (
                        <option key={position} value={position}>{position}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', 
                    gap: '10px' 
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        İşe Giriş Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '10px',
                          border: '2px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div style={{
                      background: formData.sgkStartDate ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      borderRadius: '10px',
                      padding: '10px',
                      border: formData.sgkStartDate ? '2px solid #3b82f6' : '2px solid #f59e0b'
                    }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: formData.sgkStartDate ? '#1e40af' : '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        🏥 SGK Başlama Tarihi
                        {!formData.sgkStartDate && (
                          <span style={{ 
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            GEREKLİ
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={formData.sgkStartDate}
                        onChange={(e) => setFormData({...formData, sgkStartDate: e.target.value})}
                        placeholder="SGK başlama tarihi seçiniz"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: formData.sgkStartDate ? '2px solid #3b82f6' : '2px solid #f59e0b',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      />
                      {!formData.sgkStartDate && (
                        <p style={{ 
                          fontSize: '11px', 
                          color: '#92400e', 
                          margin: '5px 0 0 0',
                          fontStyle: 'italic'
                        }}>
                          * SGK başlama tarihi eklemeyi unutmayın
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="0555 123 45 67"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="ornek@email.com"
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      background: '#6b7280',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2,
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {editingStaff ? '💾 Güncelle' : '✅ Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        {showImportModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              width: window.innerWidth <= 768 ? '95%' : '90%',
              maxWidth: '800px',
              maxHeight: window.innerWidth <= 768 ? '85vh' : '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                padding: window.innerWidth <= 768 ? '20px' : '25px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: '#1f2937',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  📊 Excel'den Personel İçe Aktar
                </h2>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  {importData.length} personel bulundu. Kontrol edin ve onaylayın.
                </p>
              </div>

              <div style={{ padding: '25px' }}>
                {importData.length > 0 ? (
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Ad Soyad</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Çalışma Alanı</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Pozisyon</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>İşe Giriş</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>SGK Tarihi</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Telefon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((staff, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.name} {staff.surname}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.workArea}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.position}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.startDate ? new Date(staff.startDate).toLocaleDateString('tr-TR') : '-'}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.sgkStartDate ? new Date(staff.sgkStartDate).toLocaleDateString('tr-TR') : '-'}
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '13px', color: '#1f2937' }}>
                              {staff.phone || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#6b7280'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <p>Excel dosyasından veri okunamadı</p>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '25px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportData([]);
                    }}
                    style={{
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#374151',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ İptal
                  </button>
                  <button
                    onClick={importStaffData}
                    disabled={importing || importData.length === 0}
                    style={{
                      background: importing ? '#9ca3af' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: importing ? 'not-allowed' : 'pointer',
                      opacity: importing ? 0.7 : 1
                    }}
                  >
                    {importing ? '⏳ İçe Aktarılıyor...' : `✅ ${importData.length} Personeli İçe Aktar`}
                  </button>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '12px',
                  border: '1px solid #bae6fd'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0c4a6e', fontSize: '14px' }}>
                    📋 Excel Dosyası Formatı:
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#075985' }}>
                    <strong>Desteklenen sütunlar:</strong><br/>
                    • "İsim Soyisim" - Ad ve soyadı birleşik (otomatik ayrıştırılır)<br/>
                    • "SGK Giriş" - SGK başlangıç tarihi (DD.MM.YYYY)<br/>
                    • "Gerçek Giriş" - İşe giriş tarihi (DD.MM.YYYY)<br/>
                    • Çalışma alanı ve pozisyon boş bırakılabilir (varsayılan: Salon)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* İşten Çıkış Tarihi Modal */}
      {showExitDateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: window.innerWidth <= 768 ? '12px' : '15px',
            padding: window.innerWidth <= 768 ? '20px' : '30px',
            width: window.innerWidth <= 768 ? '95%' : '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{
              color: '#ef4444',
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '18px',
              fontWeight: '700'
            }}>
              🚪 Personel İşten Çıkarma
            </h3>
            
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px' }}>
                <strong>{exitingStaff?.fullName}</strong> adlı personeli işten çıkarmak istediğinizden emin misiniz?
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                İşten Çıkış Tarihi
              </label>
              <input
                type="text"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                placeholder="GG/AA/YYYY veya GG.AA.YYYY"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  fontSize: '14px',
                  textAlign: 'center'
                }}
              />
              <p style={{
                margin: '5px 0 0 0',
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Örnek: {new Date().getDate().toString().padStart(2, '0')}/{(new Date().getMonth() + 1).toString().padStart(2, '0')}/{new Date().getFullYear()}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowExitDateModal(false);
                  setExitingStaff(null);
                  setExitDate('');
                }}
                style={{
                  flex: 1,
                  background: '#6b7280',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ❌ İptal
              </button>
              <button
                onClick={handleExitConfirm}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🚪 İşten Çıkar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Bildirimleri */}
      <ToastComponent />
    </div>
  );
};

export default StaffList;
