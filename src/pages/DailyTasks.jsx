import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, push, set, remove, get, update, onValue } from "firebase/database";



function DailyTasks(props) {
  // Styles
  const cardStyle = {
    borderRadius: 18,
    boxShadow: '0 4px 16px 0 rgba(0,0,0,0.07)',
    border: 'none',
    background: '#fff',
  };
  const motivasyonBox = {
    background: '#e0f7fa',
    borderRadius: 14,
    padding: '16px 24px',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: 20,
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
  // const [motivasyon] = useState('Harika bir gün! Görevlerini başarıyla tamamla!');
  // Artık props'tan alınacak
  const isAdmin = props.isAdmin || false;
  const currentUser = props.currentUser || '';
  // Her görev için birden fazla temizlik kaydı tutulacak
  const [tasks, setTasks] = useState([
    { name: 'Tuvalet Temizliği', logs: [], subtasks: [] },
    { name: 'Bar Kapanış Temizliği', logs: [], subtasks: [] },
    { name: 'Açılış Hazırlığı', logs: [], subtasks: [] },
    { name: 'Kapanış Kontrolü', logs: [], subtasks: [] },
    { name: 'Mutfak Kapanış Temizliği', logs: [], subtasks: [] },
  ]);
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
    setTasks([...tasks, { name: newTask, user: '', time: '', subtasks: [], approved: false }]);
    setNewTask('');
    showCenterToast('Görev eklendi!');
  };
  // Temizlendi butonuna tıklanınca önce onay modalı açılır
  const handleComplete = (idx) => {
    setPendingCompleteIdx(idx);
    setShowConfirm(true);
  };

  // Onay modalında evet derse asıl işlemi yapar
  const handleConfirmComplete = async () => {
    const idx = pendingCompleteIdx;
    if (idx === null) return;
    const updated = [...tasks];
    const now = new Date();
    const newLog = {
      user: currentUser,
      time: now.toLocaleTimeString(),
      date: now.toLocaleDateString(),
      approved: false,
    };
    updated[idx].logs = [...(updated[idx].logs || []), newLog];
    setTasks(updated);
    // Firebase'e onay bekleyen olarak ekle
    try {
      const newRef = push(ref(db, 'pendingCleaningApprovals'));
      await set(newRef, {
        ...newLog,
        taskName: updated[idx].name,
        taskIdx: idx
      });
      showCenterToast('Görev tamamlandı, admin onayına gönderildi!');
    } catch (err) {
      showCenterToast('Görev gönderilemedi!');
    }
    setShowConfirm(false);
    setPendingCompleteIdx(null);
  };

  // Onay modalı iptal
  const handleCancelComplete = () => {
    setShowConfirm(false);
    setPendingCompleteIdx(null);
  };
  // Admin görev düzenleme/silme
  const handleEditTask = (idx) => {
    setEditIdx(idx);
    setEditValue(tasks[idx].name);
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
  const handleDeleteTask = (idx) => {
    setTasks(tasks.filter((_, i) => i !== idx));
    showCenterToast('Görev silindi!');
  };
  const handleAddSubtask = (idx) => {
    const val = subtaskInputs[idx];
    if (!val || !val.trim()) return;
    const updated = [...tasks];
    if (!updated[idx].subtasks) updated[idx].subtasks = [];
    updated[idx].subtasks.push({ name: val, status: false });
    setTasks(updated);
    setSubtaskInputs({ ...subtaskInputs, [idx]: '' });
    showCenterToast('Alt görev eklendi!');
  };
  const handleSubtaskInput = (idx, value) => {
    setSubtaskInputs({ ...subtaskInputs, [idx]: value });
  };
  const handleCompleteSubtask = (idx, subIdx) => {
    const updated = [...tasks];
    updated[idx].subtasks[subIdx].status = true;
    setTasks(updated);
    showCenterToast('Alt görev tamamlandı!');
  };
  // Avatar helper
  const getAvatar = (name) => {
    if (!name) return <span className="avatar-circle bg-secondary me-2" style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#fff', fontWeight:700, fontSize:16}}>?</span>;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase();
    return <span className="avatar-circle bg-primary me-2" style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', color:'#fff', fontWeight:700, fontSize:16}}>{initials}</span>;
  };

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


  // Admin onay fonksiyonu (sadece adminler için görünür)
  const handleApprove = async (approval) => {
    // Günlük rapora ekle
    let today = approval.date;
    // Eğer tarih noktalı ise (tr-TR: 12.07.2025), YYYY-MM-DD'ye çevir
    if (today && today.includes('.')) {
      const [d, m, y] = today.split('.');
      today = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (!today) {
      const now = new Date();
      today = now.toISOString().slice(0, 10);
    }
    // dailyTasks/{today}/report dizisine ekle
    const dailyRef = ref(db, `dailyTasks/${today}/report`);
    // Önce mevcut raporu al
    let currentReport = [];
    try {
      const snap = await get(dailyRef);
      if (snap.exists()) {
        currentReport = snap.val();
      }
    } catch {}
    // Onaylanan logu ilgili göreve ekle
    let found = false;
    const newReport = (currentReport || []).map(task => {
      if (task.name === approval.taskName) {
        found = true;
        return {
          ...task,
          logs: [...(task.logs || []), { ...approval, approved: true }]
        };
      }
      return task;
    });
    if (!found) {
      newReport.push({ name: approval.taskName, logs: [{ ...approval, approved: true }] });
    }
    await set(dailyRef, newReport);
    // Onay bekleyenler listesinden sil
    await remove(ref(db, `pendingCleaningApprovals/${approval.id}`));
    showCenterToast('Onaylandı ve rapora eklendi!');
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 300, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Görevi tamamladınız mı?</div>
            <div className="mb-3 text-muted" style={{ fontSize: 16 }}>
              Bu görev admin onayına gönderilecek.
            </div>
            <div className="d-flex justify-content-center gap-3">
              <button className="btn btn-success" onClick={handleConfirmComplete}>Evet</button>
              <button className="btn btn-secondary" onClick={handleCancelComplete}>Hayır</button>
            </div>
          </div>
        </div>
      )}
      <div className="container my-4">
        {/* Motivasyon kutusu kaldırıldı */}
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
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
          <div className="mb-4">
            <div className="mb-2" style={{ background: '#f8fafc', borderRadius: 14, padding: 12 }}>
              <span className="fw-bold">Bugünkü görevlerin</span>
              <span style={{ float: 'right' }}>
                <span className="badge bg-primary me-2">{sortedTasks.length} görev</span>
                <span className="badge bg-success">{
                  sortedTasks.reduce((acc, t) => acc + ((t.logs || []).filter(l => l.user === currentUser).length), 0)
                }/{sortedTasks.length} tamamlandı</span>
              </span>
              <div style={{ clear: 'both' }} />
            </div>
            <div style={{ padding: '0 8px' }}>
              <div style={{ background: '#e9ecef', borderRadius: 6, height: 8, width: '100%' }}>
                <div style={{ background: '#198754', borderRadius: 6, height: 8, width: `${100 * sortedTasks.reduce((acc, t) => acc + t.logs.filter(l => l.user === currentUser).length, 0) / (sortedTasks.length || 1)}%` }} />
              </div>
            </div>
            <div className="form-check form-switch mt-2">
              <input className="form-check-input" type="checkbox" id="showOnlyIncomplete" checked={showOnlyIncomplete} onChange={() => setShowOnlyIncomplete(v => !v)} />
              <label className="form-check-label" htmlFor="showOnlyIncomplete">Sadece tamamlanmamışlar</label>
            </div>
          </div>
          {isAdmin && (
            <form className="mb-4" onSubmit={handleAddTask}>
              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="input-group">
                    <input type="text" className="form-control" placeholder="Yeni görev ekle..." value={newTask} onChange={e => setNewTask(e.target.value)} style={{ borderRadius: 12, fontSize: 16, background: '#f3f4f6' }} />
                    <button type="submit" className="btn btn-primary" style={{ borderRadius: 12 }}>Ekle</button>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4 mt-2 mt-md-0">
                  <input type="text" className="form-control" placeholder="Görev ara..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 12, fontSize: 16, background: '#f3f4f6' }} />
                </div>
              </div>
            </form>
          )}
          <div className="row g-4">
            {sortedTasks.length === 0 && (
              <div className="text-muted text-center">Görev bulunamadı.</div>
            )}
            {sortedTasks.map((task, i) => {
              const idx = tasks.indexOf(task);
              const userLogs = (task.logs || []).filter(l => l.user === currentUser);
              const cardBg = userLogs.length > 0 ? { background: '#d1e7dd' } : {};
              const cardBorder = userLogs.length > 0 ? { border: '2px solid #198754' } : { border: '1px solid #e3e3e3' };
              const taskTypeIcon = task.name.includes('Tuvalet') ? '🚻' : task.name.includes('Bar') ? '🍸' : task.name.includes('Açılış') ? '🔓' : task.name.includes('Kapanış') ? '🔒' : '📝';
              return (
                <div className="col-12 col-md-6 col-lg-4" key={task.name + i}>
                  <div className="card h-100 shadow-sm" style={{ ...cardStyle, ...cardBg, ...cardBorder }}>
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <span style={{ fontSize: 28, marginRight: 12 }}>{taskTypeIcon}</span>
                        {isAdmin && editIdx === idx ? (
                          <div className="input-group input-group-sm">
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus className="form-control" style={{ fontWeight: 700, fontSize: 18, borderRadius: 10 }} />
                            <button className="btn btn-success" onClick={() => handleEditSave(idx)} title="Kaydet" style={{ borderRadius: 10 }}>✔</button>
                            <button className="btn btn-secondary" onClick={handleEditCancel} title="Vazgeç" style={{ borderRadius: 10 }}>✖</button>
                          </div>
                        ) : (
                          <span className="fw-bold" style={{ fontSize: 20 }}>{task.name}</span>
                        )}
                        <div className="ms-auto d-flex align-items-center gap-2">
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => handleComplete(idx)} style={{ borderRadius: 10 }}>Temizlendi</button>
                          <button className="btn btn-outline-dark btn-sm" title="QR ile tamamla (yakında)" disabled style={{ borderRadius: 10 }}>QR</button>
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="badge bg-primary me-2">{userLogs.length > 0 ? (() => {
                          if (!currentUser.includes('@')) return currentUser;
                          let domain = currentUser.split('@')[1] || '';
                          if (domain.includes('.com')) domain = domain.split('.com')[0];
                          return domain.toUpperCase();
                        })() : '-'}</span>
                        <span className="badge bg-secondary" style={{ fontSize: 15 }}>{userLogs.length > 0 ? userLogs[userLogs.length - 1].time : '-'}</span>
                      </div>
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
                <table className="table table-sm table-bordered table-hover" style={{ borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                  <thead className="table-light">
                    <tr style={{ fontSize: 16 }}>
                      <th>Tarih</th>
                      <th>Saat</th>
                      <th>Kullanıcı</th>
                      <th>Görev</th>
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
                        <td>{a.taskName}</td>
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
            <div className="table-responsive">
              <table className="table table-sm table-bordered table-hover" style={{ borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <thead className="table-light">
                  <tr style={{ fontSize: 16 }}>
                    <th>Tarih</th>
                    <th>Saat</th>
                    <th>Kullanıcı</th>
                    <th>Görev</th>
                    <th>Onay</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReports.length === 0 && (
                    <tr><td colSpan={5} className="text-muted">Henüz rapor yok.</td></tr>
                  )}
                  {dailyReports.slice(-7).reverse().map((r, i) => (
                    (r.report || []).flatMap((g, j) => (
                      (g.logs || []).filter(l => l.approved !== undefined).map((l, k) => (
                        <tr key={i + '-' + j + '-' + k}>
                          <td>{l.date || r.date}</td>
                          <td>{l.time || '-'}</td>
                          <td>{l.user && l.user.includes('@') ? (() => {
                            let domain = l.user.split('@')[1] || '';
                            if (domain.includes('.com')) domain = domain.split('.com')[0];
                            return domain.toUpperCase();
                          })() : (l.user || '-')}</td>
                          <td>{g.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            {l.approved === true ? (
                              <span title="Onaylandı" style={{ color: '#198754', fontSize: 20 }}>✔️</span>
                            ) : l.approved === false ? (
                              <span title="Reddedildi" style={{ color: '#dc3545', fontSize: 20 }}>❌</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DailyTasks;
