import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  tr: {
    translation: {
      // Genel
      "loading": "Yükleniyor...",
      "save": "Kaydet",
      "cancel": "İptal",
      "delete": "Sil",
      "edit": "Düzenle",
      "add": "Ekle",
      "search": "Arama",
      "filter": "Filtreleme",
      "date": "Tarih",
      "total": "Toplam",
      "amount": "Tutar",
      "description": "Açıklama",
      "type": "Tür",
      "action": "İşlem",
      
      // Kasa Modülü
      "dailyCashEntry": "Günlük Kasa Girişi",
      "cashManagement": "Kasa Yönetim Sistemi",
      "dailySalesData": "Günlük satış verilerinizi kaydedin ve raporlayın",
      "searchAndFilter": "Arama ve Filtreleme",
      "startDate": "Başlangıç Tarihi",
      "endDate": "Bitiş Tarihi",
      "cashSales": "Nakit Satış",
      "visaSales": "Visa Satış",
      "cardSales": "Kart Satış",
      "totalRevenue": "Toplam Ciro",
      "previousBalance": "Önceki Devir",
      "receiptCount": "Adisyon Sayısı",
      "monthlyLedger": "Aylık Kasa Defteri",
      "expenseDetails": "Gider Detayları",
      "approvedExpenses": "Onaylanmış Giderler",
      "cashExpenseTotal": "Nakit Masraf Toplamı",
      "cardExpenseTotal": "Kart Masraf Toplamı",
      "addNote": "Not Ekle",
      
      // Giriş/Auth
      "login": "Giriş Yap",
      "password": "Şifre",
      "enterPassword": "Lütfen şifrenizi girin",
      "passwordHint": "Şifreyi bilmiyorsan yöneticiden talep et",
      "requestPassword": "Şifre Talep Et",
      "requestSent": "Talep Gönderildi",
      "sending": "Gönderiliyor...",
      "passwordIncorrect": "Şifre hatalı. Lütfen tekrar deneyin.",
      "requestSentToAdmins": "Talebiniz yöneticilere iletildi",
      
      // Hata Mesajları
      "systemLoading": "Sistem Yükleniyor...",
      "firebaseConnecting": "Firebase bağlantısı kontrol ediliyor",
      "dataLoading": "Veriler Yükleniyor...",
      "recordsLoading": "Kasa kayıtları ve raporlar hazırlanıyor",
      "userNotFound": "Kullanıcı bilgileri bulunamadı. Lütfen tekrar giriş yapın.",
      "requestFailed": "Talep gönderilemedi. Lütfen tekrar deneyin.",
      "pleaseEnterValidNumber": "Lütfen geçerli bir sayı girin.",
      "previousBalanceSaved": "Önceki devir kaydedildi",
      
      // Para Birimi
      "currency": "₺",
      
      // Pagination
      "page": "Sayfa",
      "of": "/",
      
      // Butonlar
      "saveRecords": "Kayıtları Kaydet",
      "newEntry": "Yeni Giriş",
      "exportCSV": "CSV İndir",
      "exportPDF": "PDF İndir"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'tr', // Varsayılan dil Türkçe
    fallbackLng: 'tr',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
