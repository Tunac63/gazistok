import React, { useState, useEffect } from "react";
import CalendarDatePicker from "../components/CalendarDatePicker";
import { db } from "../firebase/config";
import { ref, push, set, remove, get, update, onValue } from "firebase/database";
import { storage } from "../firebase/config";
import { ref as storageRef, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";



function DailyTasks(props) {
  // Günlük rapor için seçili tarih
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  // Styles
  const cardStyle = {
    borderRadius: 18,
    boxShadow: '0 4px 16px 0 rgba(0,0,0,0.07)',
    border: 'none',
    background: '#fff',
    minWidth: 0,
    width: '100%',
    maxWidth: '100%',
  };
  const motivasyonBox = {
    background: '#e0f7fa',
    borderRadius: 14,
    padding: '12px 10px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: 18,
    color: '#00796b',
    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)'
  };
  const chipStyle = {
    background: '#e3e3e3',
    borderRadius: 8,
    padding: '2px 8px',
    fontSize: 13,
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
  };
  const doneChipStyle = {
    ...chipStyle,
    background: '#b9f6ca',
    color: '#388e3c',
    textDecoration: 'line-through',
  };

  // State
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastTimeout, setToastTimeout] = useState(null);
  // Temizlendi onay modalı için state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCompleteIdx, setPendingCompleteIdx] = useState(null);
  const [pendingSubtask, setPendingSubtask] = useState({ idx: null, subIdx: null });
  // const [motivasyon] = useState('Harika bir gün! Görevlerini başarıyla tamamla!');
  // Artık props'tan alınacak
  const isAdmin = props.isAdmin || false;
  const currentUser = props.currentUser || '';
  // Her görev için birden fazla temizlik kaydı tutulacak
  const defaultTasks = [
    { name: 'Tuvalet Temizliği', logs: [], subtasks: [] },
    { name: 'Bar Kapanış Temizliği', logs: [], subtasks: [] },
    { name: 'Açılış Hazırlığı', logs: [], subtasks: [] },
    { name: 'Kapanış Kontrolü', logs: [], subtasks: [] },
    { name: 'Mutfak Kapanış Temizliği', logs: [], subtasks: [] },
    { name: 'Merdiven Temizliği', logs: [], subtasks: [] },
    { name: 'Mutfak Açılış Kontrolü', logs: [], subtasks: [] },
  ];
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('dailyTasks');
    if (saved) {
      try {
        // Tüm alt görevlerin status'unu sıfırla (eski verilerde kalanlar için)
        const parsed = JSON.parse(saved);
        return parsed.map(t => ({
          ...t,
          subtasks: (t.subtasks || []).map(s => ({ ...s, status: false }))
        }));
      } catch {
        return defaultTasks;
      }
    }
    return defaultTasks;
  });
  // Onay bekleyen temizlik kayıtları (localStorage ile paylaş)
  // Onay bekleyen temizlik kayıtları (Firebase ile paylaş)
  const [pendingApprovals, setPendingApprovals] = useState([]);

  // Günlük temizlik raporları (Firebase ile paylaş)
  const [dailyReports, setDailyReports] = useState([]);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [search, setSearch] = useState('');
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]); // Çoklu fotoğraf için state
  // Hata mesajı için ayrı bir state
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0); // Yükleme ilerlemesi için state

  // Derived
  // Kullanıcıya göre filtrele, arama ve tamamlanmamışlar
  const sortedTasks = tasks
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
    .filter(t =>
      !showOnlyIncomplete
        ? true
        : !((t.logs || []).some(l => l.user === currentUser && l.approved === false))
    );

  // Toast helper (ortada ve otomatik kaybolan)
  const showCenterToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    if (toastTimeout) clearTimeout(toastTimeout);
    const timeout = setTimeout(() => setShowToast(false), 2000);
    setToastTimeout(timeout);
  };

  // Handlers
  const handleResetTasks = () => {
    setTasks(tasks.map(t => ({ ...t, time: '', user: '', approved: false, subtasks: t.subtasks?.map(s => ({...s, status: false})) || [] })));
    showCenterToast('Tüm görevler sıfırlandı!');
  };
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const updated = [...tasks, { name: newTask, user: '', time: '', subtasks: [], approved: false }];
    setTasks(updated);
    localStorage.setItem('dailyTasks', JSON.stringify(updated));
    setNewTask('');
    showCenterToast('Görev eklendi!');
  };
  // Temizlendi butonuna tıklanınca sadece modalı aç
  const handleComplete = (idx) => {
    setShowConfirm(true);
    setPendingCompleteIdx(idx);
  };

  // Alt görev tamamla
  const handleCompleteSubtask = (idx, subIdx) => {
    // Alt görev tamamlanınca sadece status true yapılır, admin onayına gönderilmez
    const updated = [...tasks];
    updated[idx].subtasks[subIdx].status = true;
    setTasks(updated);
    localStorage.setItem('dailyTasks', JSON.stringify(updated));
    showCenterToast('Alt görev tamamlandı!');
  };

  // Fotoğrafı Firebase Storage'a yükle ve download URL'sini döndür
  const handleUploadPhotos = async (files) => {
    if (!files || files.length === 0) {
      setErrorMsg('Lütfen en az bir dosya seçin!');
      return [];
    }
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      setUploadProgress(0);
      const filePath = `photos/${Date.now()}_${i}_${file.name}`;
      const imgRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(imgRef, file);
      // eslint-disable-next-line no-await-in-loop
      const url = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(progress);
          },
          (error) => {
            setErrorMsg('Fotoğraf yüklenemedi!');
            setUploadProgress(0);
            console.error('Fotoğraf yükleme hatası:', error);
            reject(null);
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(100);
            resolve(url);
          }
        );
      });
      if (url) urls.push(url);
    }
    return urls;
  };

  const handleConfirmComplete = async () => {
    // alert('Evet butonuna basıldı!');
    console.log('Evet butonuna basıldı', { pendingPhotos, pendingCompleteIdx, uploadProgress });
    setErrorMsg("");
    const idx = pendingCompleteIdx;
    if (idx === null) {
      setErrorMsg('HATA: pendingCompleteIdx null');
      console.log('HATA: pendingCompleteIdx null');
      return;
    }
    if (!pendingPhotos || pendingPhotos.length === 0) {
      setErrorMsg('HATA: fotoğraf yok');
      console.log('HATA: fotoğraf yok');
      return;
    }
    console.log('Fotoğraf yükleme başlıyor', pendingPhotos);
    setErrorMsg('Fotoğraflar yükleniyor...');
    const photoURLs = await handleUploadPhotos(pendingPhotos);
    console.log('Fotoğraf yükleme sonucu:', photoURLs);
    if (!photoURLs || photoURLs.length === 0) {
      setErrorMsg('Fotoğraflar yüklenemedi!');
      console.log('Fotoğraflar yüklenemedi!');
      return;
    }
    setErrorMsg('Kayıt güncelleniyor...');
    console.log('Task güncelleniyor');
    const updated = [...tasks];
    const newLog = {
      user: currentUser,
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      approved: false,
      photoURLs,
    };
    updated[idx].logs = [...(updated[idx].logs || []), newLog];
    const subtasksStatusSnapshot = (updated[idx].subtasks || []).map(s => ({ name: s.name, status: s.status }));
    updated[idx].subtasks = (updated[idx].subtasks || []).map(s => ({ ...s, status: false }));
    setTasks([...updated]);
    localStorage.setItem('dailyTasks', JSON.stringify([...updated]));
    try {
      setErrorMsg('Firebase kaydı yapılıyor...');
      console.log('Firebase push başlıyor');
      const newRef = push(ref(db, 'pendingCleaningApprovals'));
      await set(newRef, {
        ...newLog,
        taskName: updated[idx].name,
        taskIdx: idx,
        subtasksStatus: subtasksStatusSnapshot,
      });
      setErrorMsg('Başarılı!');
      console.log('Firebase push başarılı');
      showCenterToast('Görev ve fotoğraflar admin onayına gönderildi!');
      setShowConfirm(false);
      setPendingCompleteIdx(null);
      setPendingPhotos([]);
    } catch (err) {
      setErrorMsg('Görev gönderilemedi!');
      console.error('Görev gönderilemedi:', err);
    }
  };

  const renderPhotoUpload = () => (
    <div className="mb-3">
      <label htmlFor="photoUpload" className="btn btn-primary" style={{fontWeight:600, borderRadius:10, padding:'8px 18px', fontSize:16, boxShadow:'0 2px 8px 0 rgba(0,0,0,0.08)'}}>
        📷 Fotoğraf Yükle
        <input
          type="file"
          id="photoUpload"
          accept="image/*"
          capture="environment"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => setPendingPhotos(Array.from(e.target.files))}
        />
      </label>
      {pendingPhotos && pendingPhotos.length > 0 && (
        <div className="d-flex flex-wrap mt-3 gap-2">
          {pendingPhotos.map((file, idx) => (
            <div key={idx} style={{position:'relative', border:'1px solid #eee', borderRadius:8, overflow:'hidden', width:60, height:60, background:'#fafafa'}}>
              <img src={URL.createObjectURL(file)} alt="Seçilen" style={{width:'100%', height:'100%', objectFit:'cover'}} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdminApproval = (approval) => (
    <tr key={approval.id}>
      <td>{approval.date || '-'}</td>
      <td>{approval.time || '-'}</td>
      <td>{approval.user || '-'}</td>
      <td>{approval.taskName}</td>
      <td>
        {/* Hem eski hem yeni kayıtlar için fotoğraf gösterimi */}
        {approval.photoURLs && approval.photoURLs.length > 0 && approval.photoURLs.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:8, border:'1px solid #eee'}} />
          </a>
        ))}
        {approval.photoURL && (
          <a href={approval.photoURL} target="_blank" rel="noopener noreferrer">
            <img src={approval.photoURL} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:8, border:'1px solid #eee'}} />
          </a>
        )}
        <button className="btn btn-success btn-sm me-2" onClick={() => handleApprove(approval)}>Onayla</button>
        <button className="btn btn-danger btn-sm" onClick={async () => {
          await remove(ref(db, `pendingCleaningApprovals/${approval.id}`));
          showCenterToast('Kayıt reddedildi ve silindi!');
        }}>Reddet</button>
      </td>
    </tr>
  );

  const renderReports = (report) => (
    <div>
      {report.report.map((log, i) => (
        <div key={i}>
          <p>{log.taskName}</p>
          {log.photoURL && (
            <a href={log.photoURL} target="_blank" rel="noopener noreferrer">Fotoğrafı Gör</a>
          )}
        </div>
      ))}
    </div>
  );

  // Firebase'den pendingApprovals ve dailyReports'u dinle
  useEffect(() => {
    const pendingRef = ref(db, 'pendingCleaningApprovals');
    const dailyRef = ref(db, 'dailyTasks');
    const unsub1 = onValue(pendingRef, (snap) => {
      const arr = [];
      if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([id, data]) => {
          arr.push({ id, ...data });
        });
      }
      setPendingApprovals(arr);
    });
    const unsub2 = onValue(dailyRef, (snap) => {
      const arr = [];
      if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([date, data]) => {
          arr.push({ date, ...data });
        });
      }
      setDailyReports(arr);
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker desteği bulunmuyor.');
      return;
    }

    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker başarıyla kaydedildi:', registration);
      })
      .catch((error) => {
        console.error('Service Worker kaydı sırasında hata oluştu:', error);
      });
  }, []);


  // Admin onay fonksiyonu (sadece adminler için görünür)
  const handleApprove = async (approval) => {
    // Günlük rapora ekle
    let today = approval.date;
    if (today && today.includes('.')) {
      const [d, m, y] = today.split('.');
      today = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (!today) {
      const now = new Date();
      today = now.toISOString().slice(0, 10);
    }
    const dailyRef = ref(db, `dailyTasks/${today}/report`);
    let currentReport = [];
    try {
      const snap = await get(dailyRef);
      if (snap.exists()) {
        currentReport = snap.val();
      }
    } catch {}
    // Onaylanan logu ve alt görev loglarını ilgili göreve ekle
    let found = false;
    // Alt görev loglarını ekle
    let subtaskLogs = [];
    // Onay kaydında alt görevlerin durumunu kullan
    if (approval.subtasksStatus && Array.isArray(approval.subtasksStatus)) {
      approval.subtasksStatus.forEach((sub, subIdx) => {
        subtaskLogs.push({
          user: approval.user,
          time: approval.time,
          date: approval.date,
          approved: true,
          subtaskName: sub.name,
          isSubtask: true,
          subtaskIdx: subIdx,
          subtaskStatus: sub.status === true
        });
      });
    } else if (approval.taskIdx !== undefined && tasks[approval.taskIdx]) {
      // Geriye dönük uyumluluk için
      const subtasks = tasks[approval.taskIdx].subtasks || [];
      subtasks.forEach((sub, subIdx) => {
        subtaskLogs.push({
          user: approval.user,
          time: approval.time,
          date: approval.date,
          approved: true,
          subtaskName: sub.name,
          isSubtask: true,
          subtaskIdx: subIdx,
          subtaskStatus: sub.status === true
        });
      });
    }
    const newReport = (currentReport || []).map(task => {
      if (task.name === approval.taskName) {
        found = true;
        return {
          ...task,
          logs: [...(task.logs || []), { ...approval, approved: true }, ...subtaskLogs]
        };
      }
      return task;
    });
    if (!found) {
      newReport.push({ name: approval.taskName, logs: [{ ...approval, approved: true }, ...subtaskLogs] });
    }
    await set(dailyRef, newReport);
    await remove(ref(db, `pendingCleaningApprovals/${approval.id}`));
    showCenterToast('Onaylandı ve rapora eklendi!');
    if (approval.taskIdx !== undefined) {
      const updatedTasks = [...tasks];
      if (updatedTasks[approval.taskIdx]) {
        updatedTasks[approval.taskIdx].subtasks = (updatedTasks[approval.taskIdx].subtasks || []).map(s => ({ ...s, status: false }));
      }
      setTasks(updatedTasks);
      localStorage.setItem('dailyTasks', JSON.stringify(updatedTasks));
    }
  };

  // Eksik handler fonksiyonları en üste ekleniyor
  const handleCancelComplete = () => {
    setShowConfirm(false);
    setPendingCompleteIdx(null);
    // ...existing code...
  };

  const handleEditSave = (idx) => {
    const updated = [...tasks];
    updated[idx].name = editValue;
    setTasks(updated);
    setEditIdx(null);
    setEditValue('');
    showCenterToast('Görev güncellendi!');
  };

  const handleEditCancel = () => {
    setEditIdx(null);
    setEditValue('');
  };

  const handleAddSubtask = (idx) => {
    const val = subtaskInputs[idx];
    if (!val || !val.trim()) return;
    const updated = [...tasks];
    if (!updated[idx].subtasks) updated[idx].subtasks = [];
    updated[idx].subtasks.push({ name: val, status: false });
    setTasks(updated);
    localStorage.setItem('dailyTasks', JSON.stringify(updated));
    setSubtaskInputs({ ...subtaskInputs, [idx]: '' });
    showCenterToast('Alt görev eklendi!');
  };

  const handleSubtaskInput = (idx, value) => {
    setSubtaskInputs({ ...subtaskInputs, [idx]: value });
  };

  // The return block aşağıda güncellendi
  return (
    <>
      {/* Toast */}
      {/* Ortada çıkan toast */}
      {showToast && (
        <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', background: '#198754', color: '#fff', borderRadius: 12, padding: '18px 32px', minWidth: 220, textAlign: 'center', fontSize: 18, zIndex: 9999, boxShadow: '0 2px 16px rgba(0,0,0,0.18)' }}>
          {toastMsg}
        </div>
      )}
      {/* Temizlendi onay modalı */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding:'10px' }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '24px 16px', width: '100%', maxWidth: 370, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', textAlign: 'center', margin:'0 auto' }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, color:'#222', letterSpacing:'-0.5px' }}>Görevi tamamladınız mı?</div>
            <div className="mb-3 text-muted" style={{ fontSize: 15, marginBottom:18, color:'#555' }}>
              Bu görev admin onayına gönderilecek.
            </div>
            <div className="mb-3">
              <label htmlFor="photoUpload" style={{fontWeight:600, fontSize:16, marginBottom:10, display:'block', color:'#1976d2'}}>Fotoğraf yükle:</label>
              <label htmlFor="photoUpload" className="btn btn-primary w-100" style={{fontWeight:600, borderRadius:12, padding:'12px 0', fontSize:17, boxShadow:'0 2px 8px 0 rgba(0,0,0,0.08)', cursor:'pointer', marginBottom:10}}>
                📷 Fotoğraf Seç
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/*"
                  capture="environment"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => setPendingPhotos(Array.from(e.target.files))}
                />
              </label>
              {pendingPhotos && pendingPhotos.length > 0 && (
                <div className="d-flex flex-wrap mt-2 gap-2 justify-content-center">
                  {pendingPhotos.map((file, idx) => (
                    <div key={idx} style={{position:'relative', border:'1px solid #eee', borderRadius:10, overflow:'hidden', width:64, height:64, background:'#fafafa', boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                      <img src={URL.createObjectURL(file)} alt="Seçilen" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    </div>
                  ))}
                </div>
              )}
              {uploadProgress > 0 && (
                <div className="progress mt-2" style={{height: 20}}>
                  <div className="progress-bar" role="progressbar" style={{width: `${uploadProgress}%`}} aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                    {uploadProgress}%
                  </div>
                </div>
              )}
              {errorMsg && <div style={{color:'red',marginTop:8, fontWeight:'bold'}}>{errorMsg}</div>}
            </div>
            <div className="d-flex justify-content-center gap-2 mt-3 flex-wrap">
              <button className="btn btn-success" style={{fontWeight:600, fontSize:16, borderRadius:10, minWidth:100, padding:'10px 0'}} onClick={handleConfirmComplete} disabled={pendingPhotos.length === 0 || (uploadProgress > 0 && uploadProgress < 100)}>
                {uploadProgress > 0 && uploadProgress < 100 ? 'Yükleniyor...' : 'Evet'}
              </button>
              <button className="btn btn-secondary" style={{fontWeight:600, fontSize:16, borderRadius:10, minWidth:100, padding:'10px 0'}} onClick={handleCancelComplete}>Hayır</button>
            </div>
          </div>
        </div>
      )}
      <div className="container-fluid px-1 px-sm-2 px-md-3 my-3">
        {/* Motivasyon kutusu kaldırıldı */}
        <div className="mx-auto w-100" style={{ maxWidth: 1200 }}>
          <div className="mb-4">
            {(() => {
              // E-posta adresinden @ sonrası, .com ve sonrası hariç, büyük harflerle
              let displayPart = "";
              if (currentUser && currentUser.includes("@")) {
                let domain = currentUser.split("@")[1] || "";
                if (domain.includes(".com")) {
                  domain = domain.split(".com")[0];
                }
                displayPart = domain.toUpperCase();
              }
              return (
                <span className="fw-bold" style={{ fontSize: 18 }}>
                  <span role="img" aria-label="wave" style={{marginRight:6}}>👋</span>
                  HOŞGELDİN {displayPart}
                </span>
              );
            })()}
          </div>

          <div className="row g-3 g-md-4">
            {sortedTasks.length === 0 && (
              <div className="text-muted text-center">Görev bulunamadı.</div>
            )}
            {sortedTasks.map((task, i) => {
              const idx = tasks.indexOf(task);
              // Sadece bugünkü ve onaylanmış ana görev logları için yeşil arka plan ve border
              const today = new Date().toLocaleDateString();
              const userLogs = (task.logs || []).filter(l => l.user === currentUser && l.date === today && l.approved === true && !l.isSubtask);
              const cardBg = userLogs.length > 0 ? { background: '#d1e7dd' } : {};
              const cardBorder = userLogs.length > 0 ? { border: '2px solid #198754' } : { border: '1px solid #e3e3e3' };
              const taskTypeIcon = task.name.includes('Tuvalet') ? '🚻' : task.name.includes('Bar') ? '🍸' : task.name.includes('Açılış') ? '🔓' : task.name.includes('Kapanış') ? '🔒' : '📝';
              return (
                <div className="col-12 col-sm-12 col-md-6 col-lg-4" key={task.name + i}>
                  <div className="card h-100 shadow-sm w-100" style={{ ...cardStyle, ...cardBg, ...cardBorder, minWidth: 0 }}>
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <span style={{ fontSize: 28, marginRight: 12 }}>{taskTypeIcon}</span>
                        {isAdmin && editIdx === idx ? (
                          <div className="input-group input-group-sm">
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus className="form-control" style={{ fontWeight: 700, fontSize: 16, borderRadius: 10 }} />
                            <button className="btn btn-success" onClick={() => handleEditSave(idx)} title="Kaydet" style={{ borderRadius: 10 }}>✔</button>
                            <button className="btn btn-secondary" onClick={handleEditCancel} title="Vazgeç" style={{ borderRadius: 10 }}>✖</button>
                          </div>
                        ) : (
                          <span className="fw-bold" style={{ fontSize: 20 }}>{task.name}</span>
                        )}
                        <div className="ms-auto d-flex align-items-center gap-2">
                          <button className="btn btn-outline-secondary btn-sm" 
                            onClick={() => handleComplete(idx)} 
                            style={{ borderRadius: 10 }}
                            disabled={task.subtasks && task.subtasks.length > 0 && !task.subtasks.some(s => s.status)}
                          >Temizlendi</button>
                          <button className="btn btn-outline-dark btn-sm" title="QR ile tamamla (yakında)" disabled style={{ borderRadius: 10 }}>QR</button>
                        </div>
                      </div>
                      <div className="mb-2 d-flex flex-wrap gap-2 align-items-center">
                        <span className="badge bg-primary">{userLogs.length > 0 ? (() => {
                          if (!currentUser.includes('@')) return currentUser;
                          let domain = currentUser.split('@')[1] || '';
                          if (domain.includes('.com')) domain = domain.split('.com')[0];
                          return domain.toUpperCase();
                        })() : '-'}</span>
                        <span className="badge bg-secondary" style={{ fontSize: 14 }}>{userLogs.length > 0 ? userLogs[userLogs.length - 1].time : '-'}</span>
                      </div>
                      {/* Alt görevler */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <ul className="list-group mb-2">
                          {task.subtasks.map((sub, subIdx) => (
                            <li key={subIdx} className="list-group-item d-flex justify-content-between align-items-center px-2 py-2" style={{ borderRadius: 8, marginBottom: 4, fontSize: 14 }}>
                              <span>{sub.name}</span>
                              {sub.status ? <span className="badge bg-success">Tamamlandı</span> : <button className="btn btn-outline-success btn-sm" onClick={() => handleCompleteSubtask(idx, subIdx)}>Tamamla</button>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* Sadece adminler alt görev ekleyebilsin */}
                      {isAdmin && (
                        <form className="d-flex flex-column flex-sm-row mb-2 gap-2" onSubmit={e => { e.preventDefault(); handleAddSubtask(idx); }}>
                          <input type="text" className="form-control form-control-sm" placeholder="Alt görev ekle..." value={subtaskInputs[idx] || ''} onChange={e => handleSubtaskInput(idx, e.target.value)} />
                          <button type="submit" className="btn btn-sm btn-primary">Ekle</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Admin Panel: Onay Bekleyenler */}
          {isAdmin && (
            <div className="mt-4">
              <h6 className="mb-3" style={{ fontWeight: 700, fontSize: 18 }}>🛡️ Onay Bekleyen Temizlik Kayıtları</h6>
              <div className="table-responsive">
                <table className="table table-sm table-bordered table-hover align-middle" style={{ borderRadius: 12, overflow: 'hidden', background: '#fff', minWidth: 400 }}>
                  <thead className="table-light">
                    <tr style={{ fontSize: 16 }}>
                      <th>Tarih</th>
                      <th>Saat</th>
                      <th>Kullanıcı</th>
                      <th>Görev</th>
                      <th>Fotoğraf</th>
                      <th>Onay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.length === 0 && (
                      <tr><td colSpan={5} className="text-muted">Bekleyen kayıt yok.</td></tr>
                    )}
                    {pendingApprovals.map((a, i) => (
                      <tr key={a.id}>
                        <td>{a.date || '-'}</td>
                        <td>{a.time || '-'}</td>
                        <td>{a.user || '-'}</td>
                        <td>
                          {a.taskName}
                          {(() => {
                            const task = tasks[a.taskIdx];
                            if (task && task.subtasks && task.subtasks.length > 0) {
                              return (
                                <ul style={{margin:0, paddingLeft:16, fontSize:13}}>
                                  {task.subtasks.map((sub, si) => {
                                    const isDone = (task.logs || []).some(log =>
                                      log.subtaskName === sub.name &&
                                      log.user === a.user &&
                                      log.date === a.date &&
                                      log.time === a.time
                                    );
                                    return (
                                      <li key={si} style={{color: isDone ? '#198754' : '#dc3545'}}>
                                        {sub.name} {isDone ? '✔️' : '❌'}
                                      </li>
                                    );
                                  })}
                                </ul>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td>
                          {/* Hem eski hem yeni kayıtlar için fotoğraf gösterimi */}
                          {a.photoURLs && a.photoURLs.length > 0 && a.photoURLs.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:4, border:'1px solid #eee'}} />
                            </a>
                          ))}
                          {a.photoURL && (
                            <a href={a.photoURL} target="_blank" rel="noopener noreferrer">
                              <img src={a.photoURL} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:4, border:'1px solid #eee'}} />
                            </a>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-success btn-sm me-2" onClick={() => handleApprove(a)}>Onayla</button>
                          <button className="btn btn-danger btn-sm" onClick={async () => {
                            await remove(ref(db, `pendingCleaningApprovals/${a.id}`));
                            showCenterToast('Kayıt reddedildi ve silindi!');
                          }}>Reddet</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Günlük Temizlik Raporu */}
          <div className="mt-4">
            <h6 className="mb-3" style={{ fontWeight: 700, fontSize: 18 }}>📊 Günlük Temizlik Raporları</h6>
            <div className="mb-3 d-flex align-items-center gap-2 flex-wrap" style={{fontSize:14}}>
              <span className="fw-semibold">Tarih Seç:</span>
              <CalendarDatePicker value={selectedDate} onChange={setSelectedDate} min="2024-01-01" max={todayStr} />
            </div>
            {(() => {
              const report = dailyReports.find(r => r.date === selectedDate);
              if (!report) return <div className="text-muted">Seçili tarihte rapor yok.</div>;
              // Kullanıcı bazlı grupla
              const userLogs = [];
              (report.report || []).forEach((g) => {
                (g.logs || [])
                  .filter(l => l.approved !== undefined && !l.isSubtask) // sadece ana görev logları
                  .forEach((l) => {
                    userLogs.push({
                      user: l.user,
                      time: l.time,
                      approved: l.approved,
                      taskName: g.name,
                      subtasks: g.subtasks || [],
                      logs: g.logs,
                      log: l
                    });
                  });
              });
              // Kullanıcıya ve saate göre sırala (son yapılan en üstte)
              userLogs.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
              return (
                <div className="bg-white rounded shadow-sm p-2 p-sm-3" style={{minWidth:0}}>
                  <div className="fw-bold mb-2" style={{fontSize:17, color:'#1976d2'}}>{selectedDate}</div>
                  {userLogs.length === 0 && <div className="text-muted">Bu tarihte kayıt yok.</div>}
                  {userLogs.map((entry, idx) => (
                    <div key={idx} className="border rounded p-2 mb-3 bg-light" style={{fontSize:13, minWidth:0}}>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className="badge bg-secondary">{entry.time || '-'}</span>
                        <span className="badge bg-primary">{entry.user && entry.user.includes('@') ? (() => {
                          let domain = entry.user.split('@')[1] || '';
                          if (domain.includes('.com')) domain = domain.split('.com')[0];
                          return domain.toUpperCase();
                        })() : (entry.user || '-')}</span>
                        <span className="fw-semibold">{entry.taskName}</span>
                        {/* Hem eski hem yeni kayıtlar için fotoğraf gösterimi */}
                        {entry.log.photoURLs && entry.log.photoURLs.length > 0 && entry.log.photoURLs.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:8, border:'1px solid #eee'}} />
                          </a>
                        ))}
                        {entry.log.photoURL && (
                          <a href={entry.log.photoURL} target="_blank" rel="noopener noreferrer">
                            <img src={entry.log.photoURL} alt="Fotoğraf" style={{width:48, height:48, objectFit:'cover', borderRadius:8, marginRight:8, border:'1px solid #eee'}} />
                          </a>
                        )}
                        <span>
                          {entry.approved === true ? (
                            <span title="Onaylandı" style={{ color: '#198754', fontSize: 18 }}>✔️</span>
                          ) : entry.approved === false ? (
                            <span title="Reddedildi" style={{ color: '#dc3545', fontSize: 18 }}>❌</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </span>
                        {isAdmin && (
                          <button className="btn btn-danger btn-sm ms-2" title="Kaydı Sil" onClick={async () => {
                            const dailyRef = ref(db, `dailyTasks/${selectedDate}/report`);
                            let currentReport = [];
                            try {
                              const snap = await get(dailyRef);
                              if (snap.exists()) {
                                currentReport = snap.val();
                              }
                            } catch {}
                            const newReport = (currentReport || []).map((task, taskIdx) => {
                              if (task.name === entry.taskName) {
                                return {
                                  ...task,
                                  logs: (task.logs || []).filter((log, logIdx) => {
                                    return !(log.date === entry.log.date && log.time === entry.log.time && log.user === entry.log.user && log.approved === entry.log.approved);
                                  })
                                };
                              }
                              return task;
                            });
                            await set(dailyRef, newReport);
                            showCenterToast('Kayıt silindi!');
                          }}>Sil</button>
                        )}
                      </div>
                      {/* Alt görevler */}
                      {(() => {
                        // Eğer kayıttaki subtasks boşsa, orijinal görev listesinden bul
                        let subtasksToShow = entry.subtasks && entry.subtasks.length > 0
                          ? entry.subtasks
                          : (tasks.find(t => t.name === entry.taskName)?.subtasks || []);
                        if (subtasksToShow.length === 0) return null;
                        return (
                          <div className="mt-2">
                            <div className="fw-normal mb-1" style={{fontSize:12, color:'#555'}}>Alt Görevler:</div>
                            <ul className="mb-0 ps-3" style={{fontSize:12}}>
                              {subtasksToShow.map((sub, si) => {
                                // subtaskStatus logunu bul
                                let isDone = false;
                                if (entry.logs && Array.isArray(entry.logs)) {
                                  const log = entry.logs.find(l =>
                                    l.subtaskName === sub.name &&
                                    l.user === entry.user &&
                                    l.date === entry.log.date &&
                                    l.time === entry.time &&
                                    l.isSubtask
                                  );
                                  isDone = log ? log.subtaskStatus : false;
                                }
                                return (
                                  <li key={si} style={{color: isDone ? '#198754' : '#dc3545'}}>
                                    {sub.name} {isDone ? '✔️' : '❌'}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      {/* Yeni görev ekle butonu ve modalı */}
      {isAdmin && (
        <>
          <button
            className="btn btn-primary"
            style={{ position: 'fixed', bottom: 20, right: 20, borderRadius: '50%', width: 60, height: 60, fontSize: 24 }}
            onClick={() => setShowAddTaskModal(true)}
          >
            +
          </button>

          {showAddTaskModal && isAdmin && (
            <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="modal-content" style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, width: 400 }}>
                <h2>Yeni Görev Ekle</h2>
                <form onSubmit={handleAddTask}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Görev adı..."
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    style={{ marginBottom: 10 }}
                  />
                  <button type="submit" className="btn btn-success">Ekle</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddTaskModal(false)} style={{ marginLeft: 10 }}>İptal</button>
                </form>
              </div>
            </div>
          )}

          {!isAdmin && showAddTaskModal && (
            <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div className="modal-content" style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, width: 400, textAlign: 'center' }}>
                <h2>Yetkiniz Yok</h2>
                <p>Görev eklemek için admin olmanız gerekiyor.</p>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTaskModal(false)}>Tamam</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default DailyTasks;
