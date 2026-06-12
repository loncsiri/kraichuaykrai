import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { calculateRemainingGov, calculateTransactionSplit } from '../utils/calculations';
import { FiArrowLeft, FiAlertCircle, FiClock, FiUpload, FiLoader } from 'react-icons/fi';
import { format } from 'date-fns';
import { useRef } from 'react';
import { scanSlip } from '../utils/slipReader';

export const AddTransaction = () => {
  const store = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as 'expense' | 'topup') || 'expense';

  const [type, setType] = useState<'expense' | 'topup'>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('อาหารและเครื่องดื่ม');
  
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState<string>(format(new Date(), 'HH:mm'));
  
  const [note, setNote] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const numAmount = parseFloat(amount) || 0;
  
  const activeCategories = store.settings.categories && store.settings.categories.length > 0 
    ? store.settings.categories 
    : ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'];

  const { availableGovToday } = useMemo(() => calculateRemainingGov(store), [store]);

  const { govAmount, userAmount } = useMemo(() => {
    if (type === 'topup' || numAmount <= 0) return { govAmount: 0, userAmount: numAmount };
    return calculateTransactionSplit(numAmount, availableGovToday, store);
  }, [numAmount, type, availableGovToday, store]);

  const isWalletSufficient = type === 'topup' || store.walletBalance >= userAmount;
  const isFormValid = numAmount > 0 && date && time;

  const handleSave = () => {
    if (!isFormValid || !isWalletSufficient) return;

    // Combine date and time
    const timestamp = new Date(`${date}T${time}`).toISOString();
    const finalTitle = title.trim() || (type === 'expense' ? 'รายจ่าย' : 'เติมเงิน');

    store.addTransaction({
      timestamp,
      type,
      title: finalTitle,
      totalAmount: type === 'expense' ? numAmount : 0,
      govAmount: type === 'expense' ? govAmount : 0,
      userAmount: type === 'expense' ? userAmount : numAmount,
      category: type === 'expense' ? category : '',
      note: note.trim()
    });

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
        <h2 className="font-bold text-xl">{type === 'expense' ? 'เพิ่มรายการใช้จ่าย' : 'เติมเงิน'}</h2>
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
            {govAmount < numAmount * (store.settings.supportRatioGov / 100) && (
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
          />
        </div>

        {type === 'expense' && (
          <div className="mb-4">
            <label className="text-sm text-muted mb-1 block">หมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map(cat => (
                <button 
                  key={cat}
                  className={category === cat ? 'btn-primary' : 'glass'}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '14px', 
                    borderRadius: '20px',
                    border: category === cat ? 'none' : '1px solid var(--card-border)'
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
            <div className="flex gap-1 items-center" style={{ flex: 1 }}>
              <select 
                value={time.split(':')[0] || '00'} 
                onChange={(e) => setTime(`${e.target.value}:${time.split(':')[1] || '00'}`)}
                style={{ marginBottom: 0, padding: '12px 8px' }}
              >
                {Array.from({length: 24}).map((_, i) => {
                  const val = i.toString().padStart(2, '0');
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
              <span>:</span>
              <select 
                value={time.split(':')[1] || '00'} 
                onChange={(e) => setTime(`${time.split(':')[0] || '00'}:${e.target.value}`)}
                style={{ marginBottom: 0, padding: '12px 8px' }}
              >
                {Array.from({length: 60}).map((_, i) => {
                  const val = i.toString().padStart(2, '0');
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
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
