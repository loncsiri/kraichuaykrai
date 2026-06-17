import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { calculateRemainingGov, calculateTransactionSplit, isDateWithinPeriod } from '../utils/calculations';
import { FiArrowLeft, FiAlertCircle, FiClock, FiUpload, FiLoader } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { useRef, useEffect } from 'react';
import { scanSlip } from '../utils/slipReader';

export const AddTransaction = () => {
  const store = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as 'expense' | 'topup') || 'expense';
  const editId = searchParams.get('editId');

  const [type, setType] = useState<'expense' | 'topup'>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('อาหารและเครื่องดื่ม');
  
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState<string>(format(new Date(), 'HH:mm'));
  
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (editId) {
      const tx = store.transactions.find(t => t.id === editId);
      if (tx) {
        setType(tx.type);
        setAmount((tx.type === 'expense' ? tx.totalAmount : tx.userAmount).toString());
        setTitle(tx.title);
        setCategory(tx.category || 'อาหารและเครื่องดื่ม');
        const dt = parseISO(tx.timestamp);
        setDate(format(dt, 'yyyy-MM-dd'));
        setTime(format(dt, 'HH:mm'));
        setNote(tx.note || '');
      }
    }
  }, [editId]); // Intentionally omitting store.transactions to only run on mount

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const numAmount = parseFloat(amount) || 0;
  
  const activeCategories = store.settings.categories && store.settings.categories.length > 0 
    ? store.settings.categories 
    : ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'];

  const recentTitles = useMemo(() => {
    return Array.from(new Set(store.transactions.map(t => t.title).filter(Boolean)));
  }, [store.transactions]);

  const { availableGovToday } = useMemo(() => {
    return calculateRemainingGov(store, date, editId || undefined);
  }, [store, date, editId]);

  const isWithinPeriod = useMemo(() => {
    return isDateWithinPeriod(date, store.settings.periodStart, store.settings.periodEnd);
  }, [date, store.settings.periodStart, store.settings.periodEnd]);

  const { govAmount, userAmount } = useMemo(() => {
    if (type === 'topup' || numAmount <= 0) return { govAmount: 0, userAmount: numAmount };
    if (!isWithinPeriod) return { govAmount: 0, userAmount: numAmount };
    return calculateTransactionSplit(numAmount, availableGovToday, store);
  }, [numAmount, type, availableGovToday, store, isWithinPeriod]);

  const isWalletSufficient = useMemo(() => {
    if (type === 'topup') return true;
    let balance = store.walletBalance;
    if (editId) {
      const oldTx = store.transactions.find(t => t.id === editId);
      if (oldTx && oldTx.type === 'expense') balance += oldTx.userAmount;
      if (oldTx && oldTx.type === 'topup') balance -= oldTx.userAmount;
    }
    // Handle floating point precision issues (e.g. 239.99999999999997 vs 240)
    return Math.round(balance * 100) >= Math.round(userAmount * 100);
  }, [type, store.walletBalance, editId, store.transactions, userAmount]);

  const isFormValid = numAmount > 0 && date && time;

  const handleSave = () => {
    if (!isFormValid || !isWalletSufficient) return;

    // Combine date and time
    const timestamp = new Date(`${date}T${time}`).toISOString();
    const finalTitle = title.trim() || (type === 'expense' ? 'รายจ่าย' : 'เติมเงิน');

    const txData = {
      timestamp,
      type,
      title: finalTitle,
      totalAmount: type === 'expense' ? numAmount : 0,
      govAmount: type === 'expense' ? govAmount : 0,
      userAmount: type === 'expense' ? userAmount : numAmount,
      category: type === 'expense' ? category : '',
      note: note.trim(),
      govRatio: type === 'expense' && isWithinPeriod ? store.settings.supportRatioGov : 0,
      userRatio: type === 'expense' && isWithinPeriod ? store.settings.supportRatioUser : 100
    };

    if (editId) {
      store.updateTransaction(editId, txData);
    } else {
      store.addTransaction(txData);
    }

    navigate(-1);
  };

  const setNow = () => {
    const now = new Date();
    setDate(format(now, 'yyyy-MM-dd'));
    setTime(format(now, 'HH:mm'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    try {
      const data = await scanSlip(file, (p) => setScanProgress(Math.round(p * 100)));
      if (data.totalAmount > 0 || data.userAmount > 0) {
        setAmount((data.totalAmount || data.userAmount).toString());
      }
      if (data.title) setTitle(data.title);
      if (data.date) setDate(data.date);
      if (data.time) setTime(data.time);
      setType('expense');
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการอ่านสลิป');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-col gap-4">
      <div className="flex items-center gap-4 mb-4">
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <FiArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-xl">
          {editId ? 'แก้ไขรายการ' : (type === 'expense' ? 'เพิ่มรายการใช้จ่าย' : 'เติมเงิน')}
        </h2>
      </div>

      <div className="glass p-4">
        <div className="mb-4">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            className="glass w-full flex items-center justify-center gap-2" 
            style={{ padding: '16px', border: '2px dashed var(--primary-color)', color: 'var(--primary-color)' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <div style={{ animation: 'spin 1s linear infinite' }}><FiLoader /></div>
                กำลังสแกนสลิป... {scanProgress}%
              </>
            ) : (
              <>
                <FiUpload />
                อัปโหลดสลิปเพื่อสแกนอัตโนมัติ
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button 
            className={`flex-1 ${type === 'expense' ? 'btn-primary' : 'glass'}`} 
            style={{ padding: '8px', border: type === 'expense' ? 'none' : '' }}
            onClick={() => setType('expense')}
          >
            รายจ่าย
          </button>
          <button 
            className={`flex-1 ${type === 'topup' ? 'btn-primary' : 'glass'}`}
            style={{ padding: '8px', border: type === 'topup' ? 'none' : '' }}
            onClick={() => setType('topup')}
          >
            เติมเงิน
          </button>
        </div>

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">จำนวนเงิน (บาท)</label>
          <input 
            type="number" 
            inputMode="decimal"
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            placeholder="0.00" 
            style={{ fontSize: '24px', fontWeight: 'bold' }}
            min="0"
            step="0.01"
          />
        </div>

        {type === 'expense' && numAmount > 0 && (
          <div className="glass p-4 mb-4" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-muted">รัฐช่วยจ่าย ({store.settings.supportRatioGov}%)</span>
              <span className="font-bold text-primary">{govAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted">เราจ่ายเอง</span>
              <span className={`font-bold ${!isWalletSufficient ? 'text-danger' : ''}`}>
                {userAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท
              </span>
            </div>
            {!isWalletSufficient && (
              <div className="flex items-center gap-2 mt-2 text-danger text-sm">
                <FiAlertCircle />
                <span>ยอดเงินในกระเป๋าไม่พอ (มี {store.walletBalance.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท)</span>
              </div>
            )}
            {!isWithinPeriod && (
              <div className="flex items-center gap-2 mt-2 text-warning text-sm" style={{ color: 'var(--warning-color)' }}>
                <FiAlertCircle />
                <span>วันที่เลือกอยู่นอกช่วงเวลาโครงการที่ตั้งไว้ในหน้าตั้งค่า รัฐจะไม่ช่วยสนับสนุนในรายการนี้</span>
              </div>
            )}
            {isWithinPeriod && govAmount < numAmount * (store.settings.supportRatioGov / 100) && govAmount > 0 && (
              <div className="flex items-center gap-2 mt-2 text-warning text-sm" style={{ color: 'var(--warning-color)' }}>
                <FiAlertCircle />
                <span>สิทธิ์รัฐบาลคงเหลือไม่พอหักตามสัดส่วนปกติ (ส่วนต่างถูกหักจากกระเป๋าเรา)</span>
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">ชื่อรายการ</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="เช่น ซื้อข้าว, เติมน้ำมัน" 
            list="title-suggestions"
          />
          <datalist id="title-suggestions">
            {recentTitles.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>

        {type === 'expense' && (
          <div className="mb-4">
            <label className="text-sm text-muted mb-1 block">หมวดหมู่</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {activeCategories.map(cat => (
                <button 
                  key={cat}
                  className={category === cat ? 'btn-primary' : 'glass'}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '14px', 
                    borderRadius: '12px',
                    border: category === cat ? 'none' : '1px solid var(--card-border)',
                    width: '100%'
                  }}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">วันที่ และ เวลา (พิมพ์ได้)</label>
          <div className="flex gap-2 items-center">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              style={{ marginBottom: 0, flex: 1.5 }}
            />
            <input 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              style={{ marginBottom: 0, flex: 1 }}
            />
            <button className="glass" style={{ padding: '12px' }} onClick={setNow} title="ตอนนี้">
              <FiClock />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm text-muted mb-1 block">หมายเหตุ</label>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" 
            rows={2}
          />
        </div>

        <button 
          className="btn-primary w-full" 
          style={{ width: '100%', padding: '16px', fontSize: '16px' }}
          disabled={!isFormValid || !isWalletSufficient}
          onClick={handleSave}
        >
          บันทึกรายการ
        </button>
      </div>
    </div>
  );
};
