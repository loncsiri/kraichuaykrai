import { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Settings as ISettings } from '../store/useAppStore';
import { FiArrowLeft, FiDownload, FiUpload, FiTrash2, FiSave, FiPlus, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const store = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<ISettings>({
    ...store.settings,
    categories: store.settings.categories || ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป']
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [newCat, setNewCat] = useState('');

  const handleSave = () => {
    store.updateSettings(settings);
    setSuccessMsg('บันทึกการตั้งค่าสำเร็จ');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const addCategory = () => {
    if (newCat.trim() && !settings.categories.includes(newCat.trim())) {
      setSettings(s => ({ ...s, categories: [...s.categories, newCat.trim()] }));
      setNewCat('');
    }
  };

  const removeCategory = (cat: string) => {
    setSettings(s => ({ ...s, categories: s.categories.filter(c => c !== cat) }));
  };

  const exportCSV = () => {
    const header = ['id', 'timestamp', 'type', 'title', 'totalAmount', 'govAmount', 'userAmount', 'category', 'note'];
    const rows = store.transactions.map(tx => [
      tx.id,
      tx.timestamp,
      tx.type,
      `"${tx.title}"`,
      tx.totalAmount,
      tx.govAmount,
      tx.userAmount,
      `"${tx.category}"`,
      `"${tx.note || ''}"`
    ]);

    const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ใครช่วยใครพลัส-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) return; 
        
        const parsedTxs = lines.slice(1).map(line => {
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          const [id, timestamp, type, title, totalAmount, govAmount, userAmount, category, note] = line.split(regex).map(s => s.replace(/^"|"$/g, '').trim());
          
          return {
            id,
            timestamp,
            type: type as 'expense' | 'topup',
            title,
            totalAmount: parseFloat(totalAmount) || 0,
            govAmount: parseFloat(govAmount) || 0,
            userAmount: parseFloat(userAmount) || 0,
            category,
            note
          };
        });

        const validTxs = parsedTxs.filter(t => t.id && t.timestamp && t.title);
        
        if (validTxs.length > 0) {
          if (window.confirm(`พบข้อมูล ${validTxs.length} รายการ ต้องการเขียนทับข้อมูลเดิมทั้งหมดหรือไม่? (ข้อมูลเดิมจะถูกลบ)`)) {
            store.importData({ transactions: validTxs });
            alert('นำเข้าข้อมูลสำเร็จ');
          }
        } else {
          alert('ไม่พบข้อมูลที่ถูกต้องในไฟล์');
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center gap-4 mb-4">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <FiArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-xl">การตั้งค่า</h2>
      </div>

      <div className="glass p-4 mb-4">
        <h3 className="font-semibold text-lg mb-4 text-primary">ตั้งค่าโครงการ</h3>
        
        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">สัดส่วน รัฐ : เรา</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-xs">รัฐ (%)</span>
              <input 
                type="number" 
                value={settings.supportRatioGov}
                onChange={e => {
                  const val = parseInt(e.target.value) || 0;
                  setSettings({...settings, supportRatioGov: val, supportRatioUser: 100 - val});
                }}
              />
            </div>
            <div className="flex-1">
              <span className="text-xs">เรา (%)</span>
              <input 
                type="number" 
                value={settings.supportRatioUser}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">ยอดสนับสนุนต่อเดือน (บาท)</label>
          <input 
            type="number" 
            value={settings.monthlySupportAmount}
            onChange={e => setSettings({...settings, monthlySupportAmount: parseFloat(e.target.value) || 0})}
          />
        </div>

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">ยอดสนับสนุนสูงสุดต่อวัน (บาท)</label>
          <input 
            type="number" 
            value={settings.dailySupportLimit}
            onChange={e => setSettings({...settings, dailySupportLimit: parseFloat(e.target.value) || 0})}
          />
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex-1">
            <label className="text-sm text-muted mb-1 block">เดือนที่เริ่ม</label>
            <input 
              type="month" 
              value={settings.periodStart}
              onChange={e => setSettings({...settings, periodStart: e.target.value})}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-muted mb-1 block">เดือนที่สิ้นสุด</label>
            <input 
              type="month" 
              value={settings.periodEnd}
              onChange={e => setSettings({...settings, periodEnd: e.target.value})}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        <h3 className="font-semibold text-lg mb-2 mt-6 text-primary">หมวดหมู่ค่าใช้จ่าย</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          {settings.categories.map(cat => (
            <div key={cat} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-sm">
              <span>{cat}</span>
              <button className="text-danger" onClick={() => removeCategory(cat)} style={{ padding: '2px', background: 'none' }}>
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={newCat} 
            onChange={e => setNewCat(e.target.value)} 
            placeholder="เพิ่มหมวดหมู่ใหม่..." 
            style={{ marginBottom: 0 }}
            onKeyPress={e => e.key === 'Enter' && addCategory()}
          />
          <button className="btn-primary" onClick={addCategory} style={{ padding: '0 16px' }}>
            <FiPlus />
          </button>
        </div>

        <button className="btn-primary w-full" onClick={handleSave}>
          <FiSave /> บันทึกการตั้งค่า
        </button>
        {successMsg && <div className="text-success text-center mt-2 text-sm">{successMsg}</div>}
      </div>

      <div className="glass p-4 mb-4">
        <h3 className="font-semibold text-lg mb-4 text-primary">เชื่อมต่อ Google Sheets</h3>
        <p className="text-xs text-muted mb-4">
          บันทึกรายการอัตโนมัติไปยัง Google Sheets ของคุณ <br/>
          (ต้องติดตั้ง Apps Script ก่อน <a href="https://github.com/loncsiri/kraichuaykrai/blob/main/docs/google-apps-script-template.js" target="_blank" rel="noreferrer" className="text-primary underline">ดูวิธีติดตั้งและคัดลอกโค้ด</a>)
        </p>

        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium">เปิดใช้งานการซิงค์ข้อมูล</label>
          <input 
            type="checkbox" 
            checked={store.googleSheetsEnabled}
            onChange={(e) => store.setGoogleSheetsConfig(store.googleSheetUrl, store.googleSecretKey, e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
        </div>

        {store.googleSheetsEnabled && (
          <>
            <div className="mb-4">
              <label className="text-sm text-muted mb-1 block">Apps Script Web App URL</label>
              <input 
                type="text" 
                value={store.googleSheetUrl}
                onChange={(e) => store.setGoogleSheetsConfig(e.target.value, store.googleSecretKey, store.googleSheetsEnabled)}
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm text-muted mb-1 block">Secret Key</label>
              <input 
                type="password" 
                value={store.googleSecretKey}
                onChange={(e) => store.setGoogleSheetsConfig(store.googleSheetUrl, e.target.value, store.googleSheetsEnabled)}
                placeholder="รหัสลับที่คุณตั้งไว้ใน Apps Script"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                className="glass w-full text-primary" 
                style={{ border: '1px solid var(--primary-color)' }}
                onClick={() => {
                  if (!store.googleSheetUrl || !store.googleSecretKey) {
                    alert("กรุณากรอก URL และ Secret Key ก่อน");
                    return;
                  }
                  if (store.googleSecretKey === "kraichuaykrai-secret-1234") {
                    alert("⚠️ ไม่อนุญาตให้ใช้ Secret Key เริ่มต้น\n\nเพื่อความปลอดภัย กรุณาไปเปลี่ยนค่า SECRET_KEY ในโค้ด Apps Script ให้เป็นรหัสของคุณเอง แล้วนำรหัสนั้นมากรอกที่นี่ก่อนใช้งานครับ");
                    return;
                  }
                  if (window.confirm('คำเตือน: ข้อมูลในเครื่องจะถูกแทนที่ด้วยข้อมูลจาก Google Sheets ทันที คุณแน่ใจหรือไม่?')) {
                    store.pullFromGoogleSheets();
                  }
                }}
                disabled={store.syncStatus === 'syncing'}
              >
                {store.syncStatus === 'syncing' ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Google Sheets ลงเครื่อง'}
              </button>
              
              <button 
                className="glass w-full text-primary" 
                onClick={() => {
                  if (!store.googleSheetUrl || !store.googleSecretKey) {
                    alert("กรุณากรอก URL และ Secret Key ก่อน");
                    return;
                  }
                  if (store.googleSecretKey === "kraichuaykrai-secret-1234") {
                    alert("⚠️ ไม่อนุญาตให้ใช้ Secret Key เริ่มต้น\n\nเพื่อความปลอดภัย กรุณาไปเปลี่ยนค่า SECRET_KEY ในโค้ด Apps Script ให้เป็นรหัสของคุณเอง แล้วนำรหัสนั้นมากรอกที่นี่ก่อนใช้งานครับ");
                    return;
                  }
                  if (window.confirm('คำเตือน: ข้อมูลบน Google Sheets จะถูกแทนที่ด้วยข้อมูลในเครื่อง ทันที คุณแน่ใจหรือไม่?')) {
                    store.syncAllToGoogleSheets();
                  }
                }}
                disabled={store.syncStatus === 'syncing'}
              >
                {store.syncStatus === 'syncing' ? 'กำลังซิงค์...' : 'ส่งข้อมูลในเครื่องขึ้น Google Sheets (ทับข้อมูลเดิม)'}
              </button>
            </div>
            {store.syncStatus === 'success' && <div className="text-success text-center mt-2 text-sm">การทำงานสำเร็จ!</div>}
            {store.syncStatus === 'error' && (
              <div className="text-danger text-center mt-2 text-sm">
                ล้มเหลว: {store.syncError || 'โปรดตรวจสอบ URL และ Secret Key'}
              </div>
            )}
          </>
        )}
      </div>

      <div className="glass p-4 mb-4">
        <h3 className="font-semibold text-lg mb-4 text-primary">จัดการข้อมูล</h3>
        
        <div className="flex gap-2 mb-4">
          <button className="btn-primary flex-1" style={{ background: 'var(--secondary-color)' }} onClick={exportCSV}>
            <FiDownload /> Export CSV
          </button>
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={importCSV} 
            style={{ display: 'none' }} 
          />
          <button className="glass flex-1" onClick={() => fileInputRef.current?.click()} style={{ border: '1px solid var(--text-muted)' }}>
            <FiUpload /> Import CSV
          </button>
        </div>

        <button 
          className="glass w-full text-danger" 
          style={{ border: '1px solid var(--danger-color)', color: 'var(--danger-color)' }}
          onClick={() => {
            if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลรายการทั้งหมด? การกระทำนี้ไม่สามารถกู้คืนได้')) {
              store.clearData();
              alert('ลบข้อมูลเรียบร้อย');
            }
          }}
        >
          <FiTrash2 /> ลบข้อมูลทั้งหมด
        </button>
      </div>
    </div>
  );
};
