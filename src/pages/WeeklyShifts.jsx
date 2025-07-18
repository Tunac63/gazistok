// src/pages/WeeklyShifts.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { ref, onValue, set, get } from 'firebase/database';
import { useAuthState } from 'react-firebase-hooks/auth';

// CSS animations
const modalAnimationCSS = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

// CSS injection
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = modalAnimationCSS;
  document.head.appendChild(style);
}

const WeeklyShifts = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [shifts, setShifts] = useState({});
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAttendanceDetailModal, setShowAttendanceDetailModal] = useState(false);
  const [showAttendanceQuickActions, setShowAttendanceQuickActions] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showAttendanceReport, setShowAttendanceReport] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', 'info'
  const [selectedAttendance, setSelectedAttendance] = useState({
    day: '',
    area: '',
    staffId: '',
    staffName: '',
    plannedStart: '',
    plannedEnd: '',
    actualStart: '',
    actualEnd: '',
    note: '',
    actionType: '', // 'late', 'early', 'overtime', 'absent'
    duration: '' // Süre bilgisi için
  });
  const [reportDate, setReportDate] = useState('');
  const [monthlyReportDate, setMonthlyReportDate] = useState('');
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = useState([]);
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([]);

  const areas = ['Salon', 'Bar', 'Mutfak'];
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  // Toast bildirimleri
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 9.5 saat mesai süresi için otomatik çıkış saati hesaplama
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    // 9.5 saat (9 saat 30 dakika) ekle
    const endDate = new Date(startDate.getTime() + (9.5 * 60 * 60 * 1000));
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  };

  // Mesai durumu analizi
  const analyzeAttendance = (plannedStart, plannedEnd, actualStart, actualEnd) => {
    if (!actualStart) {
      return { status: 'absent', message: '❌ Gelmedi', color: '#ef4444' };
    }

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes; // dakika cinsinden
    };

    const plannedStartMin = parseTime(plannedStart);
    const actualStartMin = parseTime(actualStart);
    
    let status = 'ontime';
    let message = '✅ Zamanında';
    let color = '#10b981';
    let details = [];

    // Geç gelme kontrolü
    if (actualStartMin > plannedStartMin) {
      const lateMinutes = actualStartMin - plannedStartMin;
      const lateHours = Math.floor(lateMinutes / 60);
      const lateMins = lateMinutes % 60;
      
      status = 'late';
      color = '#f59e0b';
      
      if (lateHours > 0) {
        message = `⏰ ${lateHours} saat ${lateMins} dk geç geldi`;
      } else {
        message = `⏰ ${lateMins} dk geç geldi`;
      }
      details.push(`Geç gelme: ${lateHours > 0 ? lateHours + ' saat ' : ''}${lateMins} dakika`);
    }

    // Erken çıkma kontrolü
    if (actualEnd && plannedEnd) {
      const plannedEndMin = parseTime(plannedEnd);
      const actualEndMin = parseTime(actualEnd);
      
      if (actualEndMin < plannedEndMin) {
        const earlyMinutes = plannedEndMin - actualEndMin;
        const earlyHours = Math.floor(earlyMinutes / 60);
        const earlyMins = earlyMinutes % 60;
        
        if (status === 'ontime') {
          status = 'early';
          color = '#f59e0b';
          message = `⏱️ ${earlyHours > 0 ? earlyHours + ' saat ' : ''}${earlyMins} dk erken çıktı`;
        } else {
          message += `, ${earlyHours > 0 ? earlyHours + ' saat ' : ''}${earlyMins} dk erken çıktı`;
        }
        details.push(`Erken çıkma: ${earlyHours > 0 ? earlyHours + ' saat ' : ''}${earlyMins} dakika`);
      }
    }

    return { status, message, color, details };
  };

  useEffect(() => {
    // Mevcut haftayı ayarla
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    const weekString = monday.toISOString().split('T')[0];
    setSelectedWeek(weekString);

    loadStaffList();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    console.log('🔍 WeeklyShifts - Admin kontrolü başlatılıyor...');
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

  useEffect(() => {
    if (selectedWeek) {
      loadWeeklyShifts();
    }
  }, [selectedWeek]);

  // Tarih değiştiğinde rapor verilerini temizle
  useEffect(() => {
    setDailyAttendanceRecords([]);
  }, [reportDate]);

  // Ay değiştiğinde aylık rapor verilerini temizle
  useEffect(() => {
    setMonthlyAttendanceRecords([]);
  }, [monthlyReportDate]);

  const loadStaffList = async () => {
    try {
      const staffRef = ref(db, 'staff');
      onValue(staffRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const staffArray = Object.entries(data).map(([id, staff]) => ({
            id,
            ...staff
          })).filter(staff => staff.isActive);
          setStaffList(staffArray);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Personel listesi yüklenirken hata:', error);
      setLoading(false);
    }
  };

  const loadWeeklyShifts = async () => {
    try {
      const shiftsRef = ref(db, `weeklyShifts/${selectedWeek}`);
      const snapshot = await get(shiftsRef);
      if (snapshot.exists()) {
        setShifts(snapshot.val());
      } else {
        // Boş shift yapısı oluştur
        const emptyShifts = {};
        days.forEach(day => {
          emptyShifts[day] = {};
          areas.forEach(area => {
            emptyShifts[day][area] = [];
          });
        });
        setShifts(emptyShifts);
      }
      
      // Mesai takip verilerini yükle
      await loadAttendanceRecords();
      
    } catch (error) {
      console.error('Shift verileri yüklenirken hata:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const attendanceRef = ref(db, `attendance/${selectedWeek}`);
      const snapshot = await get(attendanceRef);
      if (snapshot.exists()) {
        setAttendanceRecords(snapshot.val());
      } else {
        setAttendanceRecords({});
      }
    } catch (error) {
      console.error('Mesai takip verileri yüklenirken hata:', error);
    }
  };

  const saveShifts = async () => {
    setSaving(true);
    try {
      await set(ref(db, `weeklyShifts/${selectedWeek}`), shifts);
      showToastMessage('✅ Haftalık vardiya planı başarıyla kaydedildi!', 'success');
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      showToastMessage('❌ Kaydetme sırasında hata oluştu', 'error');
    }
    setSaving(false);
  };

  const updateShift = (day, area, staffId, field, value) => {
    const updatedShifts = { ...shifts };
    if (!updatedShifts[day]) updatedShifts[day] = {};
    if (!updatedShifts[day][area]) updatedShifts[day][area] = [];

    const existingShiftIndex = updatedShifts[day][area].findIndex(s => s.staffId === staffId);
    
    if (existingShiftIndex >= 0) {
      updatedShifts[day][area][existingShiftIndex][field] = value;
      
      // 🚀 Otomatik çıkış saati hesaplama - Giriş saati girildiğinde
      if (field === 'startTime' && value) {
        const autoEndTime = calculateEndTime(value);
        updatedShifts[day][area][existingShiftIndex]['endTime'] = autoEndTime;
      }
      
      // Eğer hem startTime hem endTime boşsa, shift'i kaldır
      if (!updatedShifts[day][area][existingShiftIndex].startTime && 
          !updatedShifts[day][area][existingShiftIndex].endTime) {
        updatedShifts[day][area].splice(existingShiftIndex, 1);
      }
    } else if (value) {
      const newShift = {
        staffId,
        [field]: value
      };
      
      // 🚀 Otomatik çıkış saati hesaplama - Yeni shift oluştururken
      if (field === 'startTime') {
        newShift['endTime'] = calculateEndTime(value);
      }
      
      updatedShifts[day][area].push(newShift);
    }

    setShifts(updatedShifts);
  };

  const getStaffShift = (day, area, staffId, field) => {
    if (!shifts[day] || !shifts[day][area]) return '';
    const shift = shifts[day][area].find(s => s.staffId === staffId);
    return shift ? (shift[field] || '') : '';
  };

  const exportToExcel = () => {
    let csvContent = "Gün,Alan,Personel,Başlangıç,Bitiş\n";
    
    days.forEach(day => {
      areas.forEach(area => {
        if (shifts[day] && shifts[day][area]) {
          shifts[day][area].forEach(shift => {
            const staff = staffList.find(s => s.id === shift.staffId);
            csvContent += `${day},${area},${staff?.name || 'Bilinmeyen'},${shift.startTime || ''},${shift.endTime || ''}\n`;
          });
        }
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vardiya_plani_${selectedWeek}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToWhatsApp = () => {
    let message = `📅 HAFTALIK VARDİYA PLANI\n📆 Hafta: ${selectedWeek}\n\n`;
    
    days.forEach(day => {
      message += `📌 ${day.toUpperCase()}\n`;
      areas.forEach(area => {
        if (shifts[day] && shifts[day][area] && shifts[day][area].length > 0) {
          message += `  🏢 ${area}:\n`;
          shifts[day][area].forEach(shift => {
            const staff = staffList.find(s => s.id === shift.staffId);
            const startTime = shift.startTime || '--:--';
            const endTime = shift.endTime || '--:--';
            message += `    • ${staff?.name || 'Bilinmeyen'}: ${startTime} - ${endTime}\n`;
          });
        }
      });
      message += '\n';
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Mesai takip fonksiyonları
  const openAttendanceQuickActions = (day, area, staffId, staffName) => {
    const plannedStart = getStaffShift(day, area, staffId, 'startTime');
    const plannedEnd = getStaffShift(day, area, staffId, 'endTime');
    
    setSelectedAttendance({
      day,
      area,
      staffId,
      staffName,
      plannedStart,
      plannedEnd,
      actualStart: '',
      actualEnd: '',
      note: ''
    });
    
    setShowAttendanceModal(false);
    setShowAttendanceQuickActions(true);
  };

  const handleLateArrival = () => {
    setSelectedAttendance(prev => ({
      ...prev,
      actionType: 'late',
      duration: '',
      note: 'Geç geldi'
    }));
    setShowAttendanceQuickActions(false);
    setShowDurationModal(true);
  };

  const handleEarlyLeave = () => {
    setSelectedAttendance(prev => ({
      ...prev,
      actionType: 'early',
      duration: '',
      note: 'Erken çıktı'
    }));
    setShowAttendanceQuickActions(false);
    setShowDurationModal(true);
  };

  const handleOvertime = () => {
    setSelectedAttendance(prev => ({
      ...prev,
      actionType: 'overtime',
      duration: '',
      note: 'Fazla mesai yaptı'
    }));
    setShowAttendanceQuickActions(false);
    setShowDurationModal(true);
  };

  const handleAbsent = async () => {
    try {
      const attendanceKey = `${selectedAttendance.day}_${selectedAttendance.area}_${selectedAttendance.staffId}`;
      const record = {
        staffId: selectedAttendance.staffId,
        staffName: selectedAttendance.staffName,
        day: selectedAttendance.day,
        area: selectedAttendance.area,
        plannedStart: selectedAttendance.plannedStart,
        plannedEnd: selectedAttendance.plannedEnd,
        actualStart: '',
        actualEnd: '',
        note: 'Hiç gelmedi',
        timestamp: Date.now(),
        status: 'absent'
      };

      const updates = {};
      updates[`attendance/${selectedWeek}/${attendanceKey}`] = record;
      
      await set(ref(db), updates);
      
      setAttendanceRecords(prev => ({
        ...prev,
        [attendanceKey]: record
      }));
      
      showToastMessage('❌ Devamsızlık kaydı oluşturuldu!', 'error');
      setShowAttendanceQuickActions(false);
    } catch (error) {
      console.error('Devamsızlık kaydı hatası:', error);
      showToastMessage('❌ Kayıt sırasında hata oluştu!', 'error');
    }
  };

  const openAttendanceReport = async () => {
    // Bugünün tarihini varsayılan olarak ayarla
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setReportDate(formattedDate);
    // Açılışta güncel tarih için raporu otomatik yükle
    await loadDailyAttendanceReport(formattedDate);
    setShowAttendanceReport(true);
  };

  const openMonthlyReport = async () => {
    // Bu ayın tarihini varsayılan olarak ayarla
    const today = new Date();
    const yearMonth = today.toISOString().slice(0, 7); // YYYY-MM formatında
    setMonthlyReportDate(yearMonth);
    // Açılışta bu ay için raporu otomatik yükle
    await loadMonthlyAttendanceReport(yearMonth);
    setShowMonthlyReport(true);
  };

  const loadMonthlyAttendanceReport = async (selectedMonth = null) => {
    const monthToUse = selectedMonth || monthlyReportDate;
    if (!monthToUse) return;
    
    try {
      setLoading(true);
      
      // Bu aya ait tüm haftalık kayıtları topla
      const year = monthToUse.split('-')[0];
      const month = monthToUse.split('-')[1];
      
      // Ay başından ay sonuna kadar tüm haftalık kayıtları bul
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const allRecords = [];
      
      // Her hafta için kontrol et
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
        const monday = new Date(d);
        monday.setDate(d.getDate() - d.getDay() + 1);
        const weekString = monday.toISOString().split('T')[0];
        
        const attendanceRef = ref(db, `attendance/${weekString}`);
        const snapshot = await get(attendanceRef);
        
        if (snapshot.exists()) {
          const weeklyAttendance = snapshot.val();
          Object.values(weeklyAttendance).forEach(record => {
            // Kayıt tarihini kontrol et (seçilen aya ait mi?)
            const recordDate = new Date(record.timestamp);
            if (recordDate.getFullYear() == year && recordDate.getMonth() == month - 1) {
              allRecords.push({
                ...record,
                week: weekString,
                date: recordDate.toLocaleDateString('tr-TR')
              });
            }
          });
        }
      }
      
      setMonthlyAttendanceRecords(allRecords);
    } catch (error) {
      console.error('Aylık rapor yükleme hatası:', error);
      showToastMessage('❌ Aylık rapor yüklenirken hata oluştu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportMonthlyReport = () => {
    if (monthlyAttendanceRecords.length === 0) {
      showToastMessage('📊 Aylık rapor için veri bulunamadı!', 'info');
      return;
    }

    let csvContent = "Tarih,Hafta,Personel,Alan,Gün,Durum,Geç Gelme (dk),Erken Çıkma (dk),Fazla Mesai (dk),Not\n";
    
    monthlyAttendanceRecords.forEach(record => {
      const status = record.status === 'absent' ? 'Gelmedi' :
                    record.status === 'late' ? 'Geç Geldi' :
                    record.status === 'early' ? 'Erken Çıktı' :
                    record.status === 'overtime' ? 'Fazla Mesai' :
                    'Zamanında';
      
      csvContent += `${record.date},${record.week},${record.staffName},${record.area},${record.day},${status},${record.lateMinutes || 0},${record.earlyLeaveMinutes || 0},${record.overtimeMinutes || 0},"${record.note || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `aylık_mesai_raporu_${monthlyReportDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDailyAttendanceReport = async (selectedDate = null) => {
    const dateToUse = selectedDate || reportDate;
    if (!dateToUse) return;
    
    try {
      setLoading(true);
      
      // Seçilen tarihi gün formatına çevir
      const date = new Date(dateToUse);
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const selectedDay = dayNames[date.getDay()];
      
      const attendanceRef = ref(db, `attendance/${selectedWeek}`);
      const snapshot = await get(attendanceRef);
      
      if (snapshot.exists()) {
        const allAttendance = snapshot.val();
        
        // Seçilen gün için filtreleme
        const dailyRecords = Object.values(allAttendance).filter(record => 
          record.day === selectedDay
        );
        
        setDailyAttendanceRecords(dailyRecords);
      } else {
        setDailyAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Günlük rapor yükleme hatası:', error);
      showToastMessage('❌ Rapor yüklenirken hata oluştu!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportDailyReport = () => {
    if (dailyAttendanceRecords.length === 0) {
      showToastMessage('📊 Rapor için veri bulunamadı!', 'info');
      return;
    }

    let csvContent = "Personel,Alan,Planlanan Başlangıç,Planlanan Bitiş,Gerçek Başlangıç,Gerçek Bitiş,Durum,Not\n";
    
    dailyAttendanceRecords.forEach(record => {
      const status = record.actualStart ? 
        (record.actualStart === record.plannedStart ? 'Zamanında' : 'Geç Geldi') : 
        'Gelmedi';
      
      csvContent += `${record.staffName},${record.area},${record.plannedStart},${record.plannedEnd},${record.actualStart || 'Yok'},${record.actualEnd || 'Yok'},${status},${record.note || ''}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `günlük_mesai_raporu_${reportDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAttendanceModal = (day, area, staffId, staffName) => {
    const plannedStart = getStaffShift(day, area, staffId, 'startTime');
    const plannedEnd = getStaffShift(day, area, staffId, 'endTime');
    
    const attendanceKey = `${day}_${area}_${staffId}`;
    const existing = attendanceRecords[attendanceKey] || {};
    
    // Bugünün tarihini al
    const today = new Date();
    const formattedDate = today.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    setSelectedAttendance({
      day,
      area,
      staffId,
      staffName,
      plannedStart,
      plannedEnd,
      actualStart: existing.actualStart || '',
      actualEnd: existing.actualEnd || '',
      note: existing.note || '',
      currentDate: formattedDate,
      actionType: '',
      duration: ''
    });
    
    // Direkt quick actions modal'ını aç
    setShowAttendanceQuickActions(true);
  };

  const saveAttendanceRecord = async () => {
    try {
      setSaving(true);
      
      const attendanceKey = `${selectedAttendance.day}_${selectedAttendance.area}_${selectedAttendance.staffId}`;
      
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let overtimeMinutes = 0;
      let status = 'ontime';
      
      // Duration'u dakikaya çevir
      const durationInMinutes = selectedAttendance.duration ? parseInt(selectedAttendance.duration) : 0;
      
      if (selectedAttendance.actionType === 'late') {
        lateMinutes = durationInMinutes;
        status = 'late';
      } else if (selectedAttendance.actionType === 'early') {
        earlyLeaveMinutes = durationInMinutes;
        status = 'early';
      } else if (selectedAttendance.actionType === 'overtime') {
        overtimeMinutes = durationInMinutes;
        status = 'overtime';
      } else if (selectedAttendance.actionType === 'absent') {
        status = 'absent';
      }
      
      const record = {
        staffId: selectedAttendance.staffId,
        staffName: selectedAttendance.staffName,
        day: selectedAttendance.day,
        area: selectedAttendance.area,
        plannedStart: selectedAttendance.plannedStart,
        plannedEnd: selectedAttendance.plannedEnd,
        actualStart: selectedAttendance.actualStart || '',
        actualEnd: selectedAttendance.actualEnd || '',
        note: selectedAttendance.note,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        status,
        actionType: selectedAttendance.actionType,
        duration: durationInMinutes,
        timestamp: Date.now()
      };

      const updates = {};
      updates[`attendance/${selectedWeek}/${attendanceKey}`] = record;
      
      await set(ref(db), updates);
      
      // Local state'i güncelle
      setAttendanceRecords(prev => ({
        ...prev,
        [attendanceKey]: record
      }));
      
      showToastMessage('✅ Mesai kaydı başarıyla kaydedildi!', 'success');
      setShowDurationModal(false);
    } catch (error) {
      console.error('Mesai kayıt hatası:', error);
      showToastMessage('❌ Kayıt sırasında hata oluştu!', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStatus = (day, area, staffId) => {
    const attendanceKey = `${day}_${area}_${staffId}`;
    const record = attendanceRecords[attendanceKey];
    
    if (!record) return null;
    
    const plannedStart = record.plannedStart;
    const plannedEnd = record.plannedEnd;
    const actualStart = record.actualStart;
    const actualEnd = record.actualEnd;
    
    return analyzeAttendance(plannedStart, plannedEnd, actualStart, actualEnd);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f1f8e9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#2d3748' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f1f8e9 100%)',
      padding: window.innerWidth <= 768 ? '15px' : '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '8px' : '12px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: window.innerWidth <= 768 ? '10px' : '15px'
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
              ⏰ Haftalık Vardiya Planlaması
            </h1>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: '10px',
            alignItems: 'center'
          }}>
            {/* Aylık Rapor Butonu - Sadece Admin için */}
            {isAdmin && (
              <button
                onClick={() => setShowMonthlyReport(true)}
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: 'none',
                  borderRadius: window.innerWidth <= 768 ? '8px' : '10px',
                  color: 'white',
                  padding: window.innerWidth <= 768 ? '8px 12px' : '10px 15px',
                  fontSize: window.innerWidth <= 768 ? '11px' : '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: window.innerWidth <= 768 ? '100%' : 'auto',
                  marginBottom: window.innerWidth <= 768 ? '10px' : '0'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                📈 Aylık Rapor
              </button>
            )}
            
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => {
                if (!isAdmin) {
                  alert('🔒 Sadece admin hafta değiştirebilir!');
                  return;
                }
                setSelectedWeek(e.target.value);
              }}
              onClick={() => {
                if (!isAdmin) {
                  alert('🔒 Sadece admin hafta değiştirebilir!');
                }
              }}
              disabled={!isAdmin}
              style={{
                padding: window.innerWidth <= 768 ? '8px' : '10px',
                borderRadius: window.innerWidth <= 768 ? '8px' : '10px',
                border: isAdmin ? '2px solid #e2e8f0' : '2px solid #a0a0a0',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                fontWeight: '600',
                backgroundColor: isAdmin ? 'white' : '#f5f5f5',
                color: isAdmin ? 'black' : '#a0a0a0',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}
            />
            <button
              onClick={() => {
                if (!isAdmin) {
                  showToastMessage('🔒 Bu işlem için admin yetkisi gereklidir!', 'error');
                  return;
                }
                saveShifts();
              }}
              disabled={saving || !isAdmin}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '8px' : '10px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '8px 16px' : '10px 20px',
                fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                fontWeight: '600',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: (saving || !isAdmin) ? 0.7 : 1,
                width: window.innerWidth <= 768 ? '100%' : 'auto'
              }}
            >
              {isAdmin 
                ? (saving ? '💾 Kaydediliyor...' : '💾 Kaydet')
                : '🔒 Kaydet'
              }
            </button>
          </div>
        </div>

        {/* Action Buttons - Mobil Uyumlu */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: window.innerWidth <= 768 ? '20px' : '25px',
          marginBottom: '20px',
          boxShadow: '0 5px 20px rgba(0,0,0,0.08)'
        }}>
          {/* İlk Satır: Mesai Takip ve Günlük Rapor */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr 1fr',
            gap: window.innerWidth <= 768 ? '12px' : '15px',
            marginBottom: window.innerWidth <= 768 ? '15px' : '20px'
          }}>
            <button
              onClick={() => {
                if (!isAdmin) {
                  showToastMessage('🔒 Bu işlem için admin yetkisi gereklidir!', 'error');
                  return;
                }
                setShowAttendanceModal(true);
              }}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '12px' : '15px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '15px 20px' : '18px 25px',
                fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                fontWeight: '700',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                boxShadow: isAdmin ? '0 4px 15px rgba(139, 92, 246, 0.3)' : '0 4px 15px rgba(160, 160, 160, 0.3)',
                opacity: isAdmin ? 1 : 0.6
              }}
              onMouseOver={(e) => {
                if (isAdmin) {
                  e.target.style.transform = 'scale(1.02)';
                  e.target.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (isAdmin) {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.3)';
                }
              }}
            >
              {isAdmin ? '⏰ Mesai Takip' : '🔒 Mesai Takip'}
            </button>
            
            <button
              onClick={openAttendanceReport}
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '12px' : '15px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '15px 20px' : '18px 25px',
                fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 8px 25px rgba(14, 165, 233, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(14, 165, 233, 0.3)';
              }}
            >
              📊 Günlük Rapor
            </button>

            <button
              onClick={openMonthlyReport}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '12px' : '15px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '15px 20px' : '18px 25px',
                fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                gridColumn: window.innerWidth <= 768 ? '1' : 'auto'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.02)';
                e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)';
              }}
            >
              📈 Aylık Rapor
            </button>
          </div>

          {/* İkinci Satır: Export Butonları */}
          <div style={{
            display: 'flex',
            gap: window.innerWidth <= 768 ? '10px' : '12px',
            flexWrap: 'wrap',
            justifyContent: window.innerWidth <= 768 ? 'center' : 'flex-start'
          }}>
            <button
              onClick={() => {
                if (!isAdmin) {
                  showToastMessage('🔒 Bu işlem için admin yetkisi gereklidir!', 'error');
                  return;
                }
                exportToExcel();
              }}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '10px' : '12px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '12px 18px' : '14px 22px',
                fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                fontWeight: '600',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.6,
                flex: window.innerWidth <= 768 ? '1' : 'none',
                minWidth: window.innerWidth <= 768 ? '120px' : 'auto'
              }}
            >
              {isAdmin ? '📊 Excel İndir' : '🔒 Excel İndir'}
            </button>
            
            <button
              onClick={() => {
                if (!isAdmin) {
                  showToastMessage('🔒 Bu işlem için admin yetkisi gereklidir!', 'error');
                  return;
                }
                exportToWhatsApp();
              }}
              style={{
                background: isAdmin 
                  ? 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)'
                  : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                border: 'none',
                borderRadius: window.innerWidth <= 768 ? '10px' : '12px',
                color: 'white',
                padding: window.innerWidth <= 768 ? '12px 18px' : '14px 22px',
                fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                fontWeight: '600',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.6,
                flex: window.innerWidth <= 768 ? '1' : 'none',
                minWidth: window.innerWidth <= 768 ? '120px' : 'auto'
              }}
            >
              {isAdmin ? '💬 WhatsApp Paylaş' : '🔒 WhatsApp Paylaş'}
            </button>
          </div>
        </div>

        {/* Shifts Table */}
        <div style={{
          background: 'white',
          borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
          padding: window.innerWidth <= 768 ? '15px' : '25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          overflowX: 'auto'
        }}>
          <div style={{ minWidth: window.innerWidth <= 768 ? '800px' : '1000px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                  <th style={{ 
                    padding: window.innerWidth <= 768 ? '10px 8px' : '15px', 
                    textAlign: 'left', 
                    fontSize: window.innerWidth <= 768 ? '12px' : '14px', 
                    fontWeight: '700', 
                    color: '#2d3748',
                    minWidth: window.innerWidth <= 768 ? '100px' : '120px'
                  }}>
                    👤 Personel
                  </th>
                  {days.map(day => (
                    <th key={day} style={{ 
                      padding: window.innerWidth <= 768 ? '10px 5px' : '15px', 
                      textAlign: 'center', 
                      fontSize: window.innerWidth <= 768 ? '11px' : '14px', 
                      fontWeight: '700', 
                      color: '#2d3748',
                      minWidth: window.innerWidth <= 768 ? '80px' : '120px'
                    }}>
                      {window.innerWidth <= 768 ? day.slice(0, 3) : day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.map(area => (
                  <React.Fragment key={area}>
                    <tr>
                      <td colSpan={days.length + 1} style={{
                        background: 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)',
                        padding: window.innerWidth <= 768 ? '8px 10px' : '12px 15px',
                        fontSize: window.innerWidth <= 768 ? '12px' : '16px',
                        fontWeight: '700',
                        color: '#2d3748',
                        textAlign: 'center'
                      }}>
                        🏢 {area.toUpperCase()}
                      </td>
                    </tr>
                    {staffList.filter(staff => staff.workArea === area).map(staff => (
                      <tr key={staff.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ 
                          padding: window.innerWidth <= 768 ? '10px 8px' : '15px', 
                          fontWeight: '600', 
                          color: '#2d3748',
                          background: '#f8fafc',
                          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                        }}>
                          {window.innerWidth <= 768 ? staff.name?.split(' ')[0] : staff.name}
                          <div style={{ 
                            fontSize: window.innerWidth <= 768 ? '10px' : '12px', 
                            color: '#64748b', 
                            marginTop: '2px' 
                          }}>
                            {staff.position}
                          </div>
                        </td>
                        {days.map(day => (
                          <td key={day} style={{ 
                            padding: window.innerWidth <= 768 ? '8px 4px' : '10px', 
                            textAlign: 'center' 
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: window.innerWidth <= 768 ? '3px' : '5px' 
                            }}>
                              <input
                                type="time"
                                value={getStaffShift(day, area, staff.id, 'startTime')}
                                onChange={(e) => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                    return;
                                  }
                                  updateShift(day, area, staff.id, 'startTime', e.target.value);
                                }}
                                onClick={() => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                  }
                                }}
                                placeholder={isAdmin ? "Başlangıç" : "🔒 Kilitli"}
                                disabled={!isAdmin}
                                style={{
                                  padding: window.innerWidth <= 768 ? '3px' : '5px',
                                  borderRadius: window.innerWidth <= 768 ? '4px' : '6px',
                                  border: isAdmin ? '1px solid #cbd5e1' : '1px solid #a0a0a0',
                                  fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                                  textAlign: 'center',
                                  backgroundColor: isAdmin ? 'white' : '#f5f5f5',
                                  color: isAdmin ? 'black' : '#a0a0a0',
                                  cursor: isAdmin ? 'text' : 'not-allowed',
                                  width: window.innerWidth <= 768 ? '60px' : 'auto'
                                }}
                              />
                              <input
                                type="time"
                                value={getStaffShift(day, area, staff.id, 'endTime')}
                                onChange={(e) => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                    return;
                                  }
                                  updateShift(day, area, staff.id, 'endTime', e.target.value);
                                }}
                                onClick={() => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                  }
                                }}
                                placeholder={isAdmin ? "Bitiş" : "🔒 Kilitli"}
                                disabled={!isAdmin}
                                style={{
                                  padding: window.innerWidth <= 768 ? '3px' : '5px',
                                  borderRadius: window.innerWidth <= 768 ? '4px' : '6px',
                                  border: isAdmin ? '1px solid #cbd5e1' : '1px solid #a0a0a0',
                                  fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                                  textAlign: 'center',
                                  backgroundColor: isAdmin ? 'white' : '#f5f5f5',
                                  color: isAdmin ? 'black' : '#a0a0a0',
                                  cursor: isAdmin ? 'text' : 'not-allowed',
                                  width: window.innerWidth <= 768 ? '60px' : 'auto'
                                }}
                              />
                              <input
                                type="time"
                                value={getStaffShift(day, area, staff.id, 'endTime')}
                                onChange={(e) => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                    return;
                                  }
                                  updateShift(day, area, staff.id, 'endTime', e.target.value);
                                }}
                                onClick={() => {
                                  if (!isAdmin) {
                                    alert('🔒 Sadece admin vardiya oluşturabilir!');
                                  }
                                }}
                                placeholder={isAdmin ? "Bitiş" : "🔒 Kilitli"}
                                disabled={!isAdmin}
                                style={{
                                  padding: window.innerWidth <= 768 ? '3px' : '5px',
                                  borderRadius: window.innerWidth <= 768 ? '4px' : '6px',
                                  border: isAdmin ? '1px solid #cbd5e1' : '1px solid #a0a0a0',
                                  fontSize: window.innerWidth <= 768 ? '10px' : '12px',
                                  textAlign: 'center',
                                  backgroundColor: isAdmin ? 'white' : '#f5f5f5',
                                  color: isAdmin ? 'black' : '#a0a0a0',
                                  cursor: isAdmin ? 'text' : 'not-allowed',
                                  width: window.innerWidth <= 768 ? '60px' : 'auto'
                                }}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          color: 'rgba(45, 55, 72, 0.7)',
          fontSize: '14px'
        }}>
          💡 İpucu: Hafta seçin, saatleri girin ve kaydedin. Excel veya WhatsApp ile paylaşabilirsiniz.
        </div>

        {/* 🆕 Mesai Takip Modal */}
        {showAttendanceModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '25px' : '35px',
              width: window.innerWidth <= 768 ? '95%' : '90%',
              maxWidth: '800px',
              maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '15px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                  fontWeight: '700'
                }}>
                  ⏰ Mesai Takip Sistemi
                </h2>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#ef4444',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Personel Listesi */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 
                  ? '1fr' 
                  : 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: window.innerWidth <= 768 ? '15px' : '20px'
              }}>
                {areas.map(area => (
                  <div key={area} style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '15px',
                    padding: window.innerWidth <= 768 ? '15px' : '20px',
                    border: '2px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      margin: '0 0 15px 0',
                      color: '#2d3748',
                      fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                      fontWeight: '700',
                      textAlign: 'center',
                      background: 'white',
                      borderRadius: '10px',
                      padding: '10px'
                    }}>
                      🏢 {area}
                    </h3>
                    
                    {staffList.filter(staff => staff.workArea === area).map(staff => (
                      <div key={staff.id} style={{
                        background: 'white',
                        borderRadius: '10px',
                        padding: window.innerWidth <= 768 ? '12px' : '15px',
                        marginBottom: '10px',
                        border: '1px solid #e2e8f0',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                          gap: '10px'
                        }}>
                          <div style={{ textAlign: window.innerWidth <= 768 ? 'center' : 'left' }}>
                            <div style={{
                              fontWeight: '600',
                              color: '#2d3748',
                              fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                            }}>
                              {staff.fullName}
                            </div>
                            <div style={{
                              fontSize: window.innerWidth <= 768 ? '11px' : '12px',
                              color: '#64748b',
                              marginTop: '2px'
                            }}>
                              {staff.position}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => openAttendanceQuickActions('Pazartesi', area, staff.id, staff.fullName)}
                            style={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              padding: window.innerWidth <= 768 ? '6px 12px' : '8px 15px',
                              fontSize: window.innerWidth <= 768 ? '11px' : '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              minWidth: window.innerWidth <= 768 ? '100px' : '120px'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = 'scale(1.05)';
                              e.target.style.boxShadow = '0 5px 15px rgba(139, 92, 246, 0.4)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            📝 Takip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Mesai Hızlı Aksiyonlar Modal */}
        {showAttendanceQuickActions && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '25px' : '35px',
              width: window.innerWidth <= 768 ? '95%' : '500px',
              maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '15px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '18px' : '22px',
                  fontWeight: '700'
                }}>
                  👤 {selectedAttendance.staffName}
                </h2>
                <button
                  onClick={() => setShowAttendanceQuickActions(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#ef4444',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Mesai Bilgileri */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px',
                border: '2px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
                  gap: '15px',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                      📅 Tarih
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '11px' }}>
                      {selectedAttendance.currentDate || new Date().toLocaleDateString('tr-TR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                      🏢 Alan
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#2d3748' }}>
                      {selectedAttendance.area}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                      ⏰ Başlangıç
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#2d3748' }}>
                      {selectedAttendance.plannedStart || 'Belirtilmemiş'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                      🏁 Bitiş
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#2d3748' }}>
                      {selectedAttendance.plannedEnd || 'Belirtilmemiş'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hızlı Aksiyon Butonları */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <button
                  onClick={handleOvertime}
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '15px' : '20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 8px 25px rgba(124, 58, 237, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  ⏰ Fazla Mesai Yaptı
                </button>

                <button
                  onClick={handleLateArrival}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '15px' : '20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  🐌 Geç Geldi
                </button>

                <button
                  onClick={handleEarlyLeave}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '15px' : '20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  🏃 Erken Çıktı
                </button>
              </div>

              {/* Devamsızlık Butonu */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={handleAbsent}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '15px' : '20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    width: '100%'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  ❌ Hiç Gelmedi
                </button>
              </div>

              {/* Geri Butonu */}
              <button
                onClick={() => {
                  setShowAttendanceQuickActions(false);
                  setShowAttendanceModal(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  padding: window.innerWidth <= 768 ? '12px 20px' : '12px 25px',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.02)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ← Geri Dön
              </button>
            </div>
          </div>
        )}

        {/* 🆕 Süre Giriş Modal */}
        {showDurationModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '25px' : '35px',
              width: window.innerWidth <= 768 ? '95%' : '500px',
              maxHeight: window.innerWidth <= 768 ? '90vh' : '80vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
              position: 'relative'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '15px'
              }}>
                <div>
                  <h2 style={{
                    margin: 0,
                    color: '#2d3748',
                    fontSize: window.innerWidth <= 768 ? '18px' : '22px',
                    fontWeight: '700'
                  }}>
                    ⏰ Süre Belirle
                  </h2>
                  <p style={{
                    margin: '5px 0 0 0',
                    color: '#64748b',
                    fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                  }}>
                    {selectedAttendance.area} • {selectedAttendance.day}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDurationModal(false);
                    setShowAttendanceModal(true);
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    width: '35px',
                    height: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#ef4444'
                  }}
                >
                  ←
                </button>
              </div>

              {/* Personel ve Tarih Bilgisi */}
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                padding: window.innerWidth <= 768 ? '15px' : '20px',
                marginBottom: '25px',
                border: '2px solid #e0f2fe',
                textAlign: 'center'
              }}>
                <h3 style={{
                  margin: '0 0 10px 0',
                  color: '#1e40af',
                  fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                  fontWeight: '700'
                }}>
                  � {selectedAttendance.staffName}
                </h3>
                <div style={{
                  color: '#374151',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                  fontWeight: '600',
                  marginBottom: '5px'
                }}>
                  📅 {selectedAttendance.currentDate}
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                }}>
                  📍 {selectedAttendance.area} - {selectedAttendance.day}
                </div>
              </div>

              {/* Hızlı Süre Seçimi */}
              <div style={{
                marginBottom: '25px'
              }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '15px',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                }}>
                  ⚡ Hızlı Seçim (Dakika):
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)',
                  gap: '10px'
                }}>
                  {[15, 30, 45, 60, 90, 120].map(minutes => (
                    <button
                      key={minutes}
                      onClick={() => setSelectedAttendance(prev => ({
                        ...prev,
                        duration: minutes.toString()
                      }))}
                      style={{
                        background: selectedAttendance.duration === minutes.toString()
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        border: selectedAttendance.duration === minutes.toString()
                          ? '2px solid #059669'
                          : '2px solid #e2e8f0',
                        borderRadius: '8px',
                        color: selectedAttendance.duration === minutes.toString() ? 'white' : '#374151',
                        padding: window.innerWidth <= 768 ? '10px 8px' : '12px 10px',
                        fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        if (selectedAttendance.duration !== minutes.toString()) {
                          e.target.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)';
                          e.target.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedAttendance.duration !== minutes.toString()) {
                          e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                          e.target.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      {minutes}dk
                    </button>
                  ))}
                </div>
              </div>

              {/* Manuel Süre Girişi */}
              <div style={{
                marginBottom: '25px'
              }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                }}>
                  ✏️ Manuel Giriş (Dakika):
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={selectedAttendance.duration}
                  onChange={(e) => setSelectedAttendance(prev => ({
                    ...prev,
                    duration: e.target.value
                  }))}
                  placeholder="Süreyi dakika cinsinden giriniz..."
                  style={{
                    width: '100%',
                    padding: window.innerWidth <= 768 ? '12px' : '15px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <div style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '5px'
                }}>
                  Maksimum 8 saat (480 dakika) girebilirsiniz
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
              }}>
                <button
                  onClick={() => {
                    setShowDurationModal(false);
                    setShowAttendanceQuickActions(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '12px 20px' : '10px 20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ← Geri
                </button>
                <button
                  onClick={() => {
                    if (!selectedAttendance.duration || selectedAttendance.duration === '0') {
                      showToastMessage('⚠️ Lütfen süre giriniz!', 'error');
                      return;
                    }
                    saveAttendanceRecord();
                  }}
                  disabled={!selectedAttendance.duration || selectedAttendance.duration === '0'}
                  style={{
                    background: (!selectedAttendance.duration || selectedAttendance.duration === '0')
                      ? 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)'
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    padding: window.innerWidth <= 768 ? '12px 20px' : '10px 20px',
                    fontSize: window.innerWidth <= 768 ? '14px' : '14px',
                    fontWeight: '600',
                    cursor: (!selectedAttendance.duration || selectedAttendance.duration === '0') ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: (!selectedAttendance.duration || selectedAttendance.duration === '0') ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (selectedAttendance.duration && selectedAttendance.duration !== '0') {
                      e.target.style.transform = 'scale(1.05)';
                      e.target.style.boxShadow = '0 5px 15px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedAttendance.duration && selectedAttendance.duration !== '0') {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  💾 Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 Günlük Rapor Modal */}
        {showAttendanceReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '25px' : '35px',
              width: window.innerWidth <= 768 ? '95%' : '90%',
              maxWidth: '1000px',
              maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '15px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                  fontWeight: '700'
                }}>
                  📊 Günlük Mesai Raporu
                </h2>
                <button
                  onClick={() => setShowAttendanceReport(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#ef4444',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Tarih Seçimi */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px',
                border: '2px solid #e2e8f0'
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                }}>
                  📅 Rapor Tarihi Seçin:
                </label>
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                }}>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={{
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                      flex: '1',
                      minWidth: window.innerWidth <= 768 ? '100%' : '200px'
                    }}
                  />
                  <button
                    onClick={loadDailyAttendanceReport}
                    disabled={!reportDate || loading}
                    style={{
                      background: reportDate && !loading 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '12px 20px',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                      fontWeight: '600',
                      cursor: reportDate && !loading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s ease',
                      minWidth: window.innerWidth <= 768 ? '100%' : 'auto'
                    }}
                  >
                    {loading ? '🔄 Yükleniyor...' : '🔍 Rapor Getir'}
                  </button>
                </div>
              </div>

              {/* Rapor Sonuçları */}
              {dailyAttendanceRecords.length > 0 ? (
                <div>
                  {/* Özet Bilgiler */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr 1fr' : 'repeat(4, 1fr)',
                    gap: '15px',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {dailyAttendanceRecords.filter(r => r.actualStart && r.actualStart === r.plannedStart).length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        ✅ Zamanında
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {dailyAttendanceRecords.filter(r => r.lateMinutes > 0).length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        🐌 Geç Geldi
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {dailyAttendanceRecords.filter(r => r.earlyLeaveMinutes > 0).length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        🏃 Erken Çıktı
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {dailyAttendanceRecords.filter(r => !r.actualStart).length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        ❌ Gelmedi
                      </div>
                    </div>
                  </div>

                  {/* Detaylı Rapor Tablosu */}
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    border: '2px solid #e2e8f0',
                    overflowX: 'auto'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                          <th style={{ padding: '15px', textAlign: 'left', fontWeight: '700', color: '#2d3748' }}>
                            👤 Personel
                          </th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#2d3748' }}>
                            🏢 Alan
                          </th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#2d3748' }}>
                            ⏰ Planlanan
                          </th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#2d3748' }}>
                            ✅ Gerçek
                          </th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#2d3748' }}>
                            📊 Durum
                          </th>
                          <th style={{ padding: '15px', textAlign: 'center', fontWeight: '700', color: '#2d3748' }}>
                            📝 Not
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyAttendanceRecords.map((record, index) => (
                          <tr key={index} style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                          }}>
                            <td style={{ padding: '12px 15px', fontWeight: '600', color: '#2d3748' }}>
                              {record.staffName}
                            </td>
                            <td style={{ padding: '12px 15px', textAlign: 'center', color: '#64748b' }}>
                              {record.area}
                            </td>
                            <td style={{ padding: '12px 15px', textAlign: 'center', color: '#64748b' }}>
                              {record.plannedStart} - {record.plannedEnd}
                            </td>
                            <td style={{ padding: '12px 15px', textAlign: 'center', color: '#64748b' }}>
                              {record.actualStart || 'Yok'} - {record.actualEnd || 'Yok'}
                            </td>
                            <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                              <span style={{
                                background: record.status === 'absent' ? '#ef4444' :
                                           record.lateMinutes > 0 ? '#f59e0b' :
                                           record.earlyLeaveMinutes > 0 ? '#3b82f6' : '#10b981',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {record.status === 'absent' ? '❌ Gelmedi' :
                                 record.lateMinutes > 0 ? `🐌 ${Math.floor(record.lateMinutes / 60)}s ${record.lateMinutes % 60}dk geç` :
                                 record.earlyLeaveMinutes > 0 ? `🏃 ${Math.floor(record.earlyLeaveMinutes / 60)}s ${record.earlyLeaveMinutes % 60}dk erken` :
                                 '✅ Zamanında'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 15px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                              {record.note || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Export Butonu */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '25px' 
                  }}>
                    <button
                      onClick={exportDailyReport}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white',
                        padding: window.innerWidth <= 768 ? '12px 25px' : '15px 30px',
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      📊 Excel Olarak İndir
                    </button>
                  </div>
                </div>
              ) : reportDate && !loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>
                    Veri Bulunamadı
                  </h3>
                  <p style={{ margin: 0 }}>
                    Seçilen tarih için mesai kaydı bulunmuyor.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 🆕 Aylık Rapor Modal */}
        {showMonthlyReport && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: window.innerWidth <= 768 ? '15px' : '20px',
              padding: window.innerWidth <= 768 ? '25px' : '35px',
              width: window.innerWidth <= 768 ? '95%' : '90%',
              maxWidth: '1200px',
              maxHeight: window.innerWidth <= 768 ? '90vh' : '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '2px solid #f1f5f9',
                paddingBottom: '15px'
              }}>
                <h2 style={{
                  margin: 0,
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '20px' : '24px',
                  fontWeight: '700'
                }}>
                  📈 Aylık Mesai Raporu
                </h2>
                <button
                  onClick={() => setShowMonthlyReport(false)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '2px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#ef4444',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Ay Seçimi */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px',
                border: '2px solid #e2e8f0'
              }}>
                <label style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                }}>
                  📅 Rapor Ayı Seçin:
                </label>
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                }}>
                  <input
                    type="month"
                    value={monthlyReportDate}
                    onChange={(e) => setMonthlyReportDate(e.target.value)}
                    style={{
                      padding: '12px 15px',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                      flex: '1',
                      minWidth: window.innerWidth <= 768 ? '100%' : '200px'
                    }}
                  />
                  <button
                    onClick={() => loadMonthlyAttendanceReport()}
                    disabled={!monthlyReportDate || loading}
                    style={{
                      background: monthlyReportDate && !loading 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '12px 20px',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                      fontWeight: '600',
                      cursor: monthlyReportDate && !loading ? 'pointer' : 'not-allowed',
                      transition: 'all 0.3s ease',
                      minWidth: window.innerWidth <= 768 ? '100%' : 'auto'
                    }}
                  >
                    {loading ? '🔄 Yükleniyor...' : '🔍 Aylık Rapor Getir'}
                  </button>
                </div>
              </div>

              {/* Aylık Rapor Sonuçları */}
              {monthlyAttendanceRecords.length > 0 ? (
                <div>
                  {/* Aylık Özet */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr 1fr' : 'repeat(5, 1fr)',
                    gap: '15px',
                    marginBottom: '25px'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {monthlyAttendanceRecords.filter(r => r.status === 'ontime').length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        ✅ Zamanında
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {monthlyAttendanceRecords.filter(r => r.status === 'late').length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        🐌 Geç Geldi
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {monthlyAttendanceRecords.filter(r => r.status === 'early').length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        🏃 Erken Çıktı
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {monthlyAttendanceRecords.filter(r => r.status === 'overtime').length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        ⏰ Fazla Mesai
                      </div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '10px',
                      padding: '15px',
                      color: 'white',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {monthlyAttendanceRecords.filter(r => r.status === 'absent').length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>
                        ❌ Gelmedi
                      </div>
                    </div>
                  </div>

                  {/* Toplam Süreler */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '25px',
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
                    gap: '15px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {monthlyAttendanceRecords.reduce((sum, r) => sum + (r.lateMinutes || 0), 0)} dk
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Toplam Geç Gelme
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {monthlyAttendanceRecords.reduce((sum, r) => sum + (r.earlyLeaveMinutes || 0), 0)} dk
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Toplam Erken Çıkma
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
                        {monthlyAttendanceRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0)} dk
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Toplam Fazla Mesai
                      </div>
                    </div>
                  </div>

                  {/* Export Butonu */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '25px' 
                  }}>
                    <button
                      onClick={exportMonthlyReport}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white',
                        padding: window.innerWidth <= 768 ? '12px 25px' : '15px 30px',
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      📈 Aylık Raporu Excel'e İndir
                    </button>
                  </div>
                </div>
              ) : monthlyReportDate && !loading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px',
                  color: '#64748b'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>
                    Veri Bulunamadı
                  </h3>
                  <p style={{ margin: 0 }}>
                    Seçilen ay için mesai kaydı bulunmuyor.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Toast Bildirimleri */}
        {showToast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: toastType === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                       toastType === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                       'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: '600',
            maxWidth: window.innerWidth <= 768 ? '90%' : '400px',
            animation: 'toastSlideIn 0.3s ease-out',
            backdropFilter: 'blur(10px)'
          }}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyShifts;
