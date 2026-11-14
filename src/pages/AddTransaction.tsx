import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  FiAlertCircle,
  FiBookmark,
  FiCamera,
  FiCheck,
  FiClock,
  FiLoader,
  FiArrowLeft,
  FiX,
  FiZap,
} from 'react-icons/fi';
import {
  useActiveTransactions,
  useAppStore,
  useWalletBalance,
} from '../store/useAppStore';
import {
  calculateRemainingGov,
  calculateTransactionSplit,
  isDateWithinPeriod,
} from '../utils/calculations';
import { formatMoney, roundMoney, toSatang } from '../utils/money';
import { scanSlip, type ScanSlipResult } from '../utils/slipReader';
import { createSlipThumbnail, saveSlipImage } from '../utils/slipStorage';
import { useToast } from '../components/ui/toastContext';

export const AddTransaction: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const templates = useAppStore((s) => s.templates);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const addTemplate = useAppStore((s) => s.addTemplate);
  const activeTransactions = useActiveTransactions();
  const walletBalance = useWalletBalance();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const initialType = (searchParams.get('type') as 'expense' | 'topup') || 'expense';
  const editId = searchParams.get('editId');
  const templateId = searchParams.get('templateId');

  const activeCategories =
    settings.categories && settings.categories.length > 0
      ? settings.categories
      : ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'];

  const initialValues = useMemo(() => {
    if (editId) {
      const tx = activeTransactions.find((t) => t.id === editId);
      if (tx) {
        const dt = parseISO(tx.timestamp);
        return {
          type: tx.type,
          amount: (tx.type === 'expense' ? tx.totalAmount : tx.userAmount).toString(),
          title: tx.title,
          category: tx.category || activeCategories[0],
          date: format(dt, 'yyyy-MM-dd'),
          time: format(dt, 'HH:mm'),
          note: tx.note || '',
        };
      }
    }
    if (templateId) {
      const tpl = templates.find((t) => t.id === templateId);
      if (tpl) {
        return {
          type: 'expense' as const,
          amount: tpl.amount.toString(),
          title: tpl.title,
          category: tpl.category || activeCategories[0],
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          note: tpl.note || '',
        };
      }
    }
    return {
      type: initialType,
      amount: '',
      title: '',
      category: activeCategories[0],
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      note: '',
    };
    // Only snapshot initial values on mount or query change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, templateId, initialType]);

  const [type, setType] = useState<'expense' | 'topup'>(initialValues.type);
  const [amount, setAmount] = useState<string>(initialValues.amount);
  const [title, setTitle] = useState<string>(initialValues.title);
  const [category, setCategory] = useState<string>(initialValues.category);
  const [date, setDate] = useState<string>(initialValues.date);
  const [time, setTime] = useState<string>(initialValues.time);
  const [note, setNote] = useState<string>(initialValues.note);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanSlipResult | null>(null);
  const [pendingSlipFile, setPendingSlipFile] = useState<File | null>(null);
  const [attachSlip, setAttachSlip] = useState<boolean>(settings.saveSlipLocally);

  useEffect(() => {
    return () => {
      if (scanResult?.previewUrl) URL.revokeObjectURL(scanResult.previewUrl);
    };
  }, [scanResult]);

  const numAmount = roundMoney(parseFloat(amount) || 0);

  const recentTitles = useMemo(
    () => Array.from(new Set(activeTransactions.map((t) => t.title).filter(Boolean))).slice(0, 20),
    [activeTransactions]
  );

  const { availableGovToday } = useMemo(
    () => calculateRemainingGov({ transactions: activeTransactions, settings }, date, editId || undefined),
    [activeTransactions, settings, date, editId]
  );

  const isWithinPeriod = useMemo(
    () => isDateWithinPeriod(date, settings.periodStart, settings.periodEnd),
    [date, settings.periodStart, settings.periodEnd]
  );

  const { govAmount, userAmount } = useMemo(() => {
    if (type === 'topup' || numAmount <= 0) return { govAmount: 0, userAmount: numAmount };
    if (!isWithinPeriod) return { govAmount: 0, userAmount: numAmount };
    return calculateTransactionSplit(numAmount, availableGovToday, { settings });
  }, [numAmount, type, availableGovToday, settings, isWithinPeriod]);

  const effectiveWalletBalance = useMemo(() => {
    let balSatang = toSatang(walletBalance);
    if (editId) {
      const oldTx = activeTransactions.find((t) => t.id === editId);
      if (oldTx) {
        if (oldTx.type === 'expense') balSatang += toSatang(oldTx.userAmount);
        if (oldTx.type === 'topup') balSatang -= toSatang(oldTx.userAmount);
      }
    }
    return balSatang / 100;
  }, [walletBalance, editId, activeTransactions]);

  const isWalletSufficient = useMemo(() => {
    if (type === 'topup') return true;
    return toSatang(effectiveWalletBalance) >= toSatang(userAmount);
  }, [type, effectiveWalletBalance, userAmount]);

  const maxSpendUsingFullDailyQuota = useMemo(() => {
    if (!isWithinPeriod || settings.supportRatioGov <= 0) return 0;
    return roundMoney(availableGovToday / (settings.supportRatioGov / 100));
  }, [isWithinPeriod, availableGovToday, settings.supportRatioGov]);

  const isFormValid = numAmount > 0 && Boolean(date) && Boolean(time);

  const saveTransactionRecord = async (stayAndAddAnother: boolean) => {
    if (!isFormValid || !isWalletSufficient) return;

    const timestamp = new Date(`${date}T${time}`).toISOString();
    const finalTitle = title.trim() || (type === 'expense' ? 'รายจ่าย' : 'เติมเงิน');
    const shouldSaveSlip = Boolean(pendingSlipFile && attachSlip);

    const txData = {
      timestamp,
      type,
      title: finalTitle,
      totalAmount: type === 'expense' ? numAmount : 0,
      govAmount: type === 'expense' ? govAmount : 0,
      userAmount: type === 'expense' ? userAmount : numAmount,
      category: type === 'expense' ? category : '',
      note: note.trim(),
      govRatio: type === 'expense' && isWithinPeriod ? settings.supportRatioGov : 0,
      userRatio: type === 'expense' && isWithinPeriod ? settings.supportRatioUser : 100,
      hasSlipImage: shouldSaveSlip ? true : undefined,
    };

    let targetId = editId;
    if (editId) {
      const old = activeTransactions.find((t) => t.id === editId);
      updateTransaction(editId, {
        ...txData,
        hasSlipImage: shouldSaveSlip ? true : old?.hasSlipImage,
      });
      showToast('อัปเดตรายการเรียบร้อย', 'success');
    } else {
      targetId = addTransaction(txData);
      showToast('บันทึกรายการเรียบร้อย', 'success');
    }

    if (shouldSaveSlip && targetId && pendingSlipFile) {
      try {
        const thumb = await createSlipThumbnail(pendingSlipFile);
        await saveSlipImage(targetId, thumb);
      } catch {
        showToast('บันทึกรายการแล้ว แต่เก็บรูปสลิปในเครื่องไม่สำเร็จ', 'warning');
      }
    }

    if (stayAndAddAnother) {
      setAmount('');
      setTitle('');
      setNote('');
      setPendingSlipFile(null);
      setScanResult(null);
    } else {
      navigate(-1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanProgress(0);
    setPendingSlipFile(file);

    try {
      const data = await scanSlip(file, (p) => setScanProgress(Math.round(p * 100)));
      setScanResult(data);
    } catch (error) {
      console.error(error);
      showToast('เกิดข้อผิดพลาดในการอ่านสลิป', 'error');
      setPendingSlipFile(null);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyScanResult = () => {
    if (!scanResult) return;
    const amt = scanResult.totalAmount || scanResult.userAmount;
    if (amt > 0) setAmount(amt.toString());
    if (scanResult.title) setTitle(scanResult.title);
    if (scanResult.date) setDate(scanResult.date);
    if (scanResult.time) setTime(scanResult.time);
    setType('expense');
    setScanResult(null);
    showToast('นำข้อมูลจากสลิปใส่แบบฟอร์มแล้ว', 'success');
  };

  const handleSaveAsTemplate = () => {
    if (!title.trim() || numAmount <= 0) {
      showToast('กรุณากรอกชื่อรายการและจำนวนเงินก่อนบันทึกเป็นรายการประจำ', 'warning');
      return;
    }
    addTemplate({
      title: title.trim(),
      amount: numAmount,
      category,
      note: note.trim() || undefined,
    });
    showToast(`บันทึก "${title.trim()}" เป็นรายการประจำแล้ว`, 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
          className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
        >
          <FiArrowLeft size={22} />
        </button>
        <h2 className="font-bold text-xl">
          {editId ? 'แก้ไขรายการ' : type === 'expense' ? 'เพิ่มรายการใช้จ่าย' : 'เติมเงินเข้ากระเป๋า'}
        </h2>
      </div>

      {/* Quick Templates */}
      {!editId && templates.length > 0 && type === 'expense' && (
        <div className="card p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] mb-2">
            <FiZap className="text-amber-500" size={14} />
            <span>เลือกจากรายการประจำ</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setTitle(tpl.title);
                  setAmount(tpl.amount.toString());
                  setCategory(tpl.category || activeCategories[0]);
                  setNote(tpl.note || '');
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] border border-[var(--card-border)] hover:border-[var(--primary-color)] cursor-pointer transition"
              >
                {tpl.title} · <span className="font-bold tabular-nums">{formatMoney(tpl.amount)} ฿</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slip Scanner */}
      <div className="card p-4">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-[var(--primary-color)]/60 bg-blue-500/5 hover:bg-blue-500/10 text-[var(--primary-color)] font-semibold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-60"
        >
          {isScanning ? (
            <>
              <FiLoader className="animate-spin" size={22} />
              <span className="text-sm">กำลังสแกนสลิปบนเครื่อง... {scanProgress}%</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-base">
                <FiCamera size={20} />
                <span>สแกนสลิปอัตโนมัติ (ออฟไลน์ 100%)</span>
              </div>
              <span className="text-xs font-normal text-[var(--text-muted)]">
                รองรับสลิป G-Wallet / เป๋าตัง และสลิปโอนเงินธนาคารไทย
              </span>
            </>
          )}
        </button>

        {/* Scan Preview & Verification Card */}
        {scanResult && (
          <div className="mt-4 p-3.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-bold text-[var(--primary-color)]">
                ตรวจสอบผลสแกน ({scanResult.parserName === 'g-wallet' ? 'G-Wallet' : 'สลิปธนาคาร'})
              </span>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                aria-label="ปิดผลสแกน"
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {scanResult.warnings.length > 0 && (
              <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {scanResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <FiAlertCircle className="shrink-0 mt-0.5" size={13} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 items-start mb-3">
              <img
                src={scanResult.previewUrl}
                alt="ตัวอย่างสลิปหลังปรับความคมชัด"
                className="w-20 h-28 object-cover rounded-lg border border-[var(--card-border)] bg-white shrink-0"
              />
              <div className="flex-1 grid grid-cols-1 gap-1.5 text-xs">
                <label className="block">
                  <span className="text-[var(--text-muted)]">ชื่อร้าน / รายการ</span>
                  <input
                    type="text"
                    value={scanResult.title}
                    onChange={(e) => setScanResult({ ...scanResult, title: e.target.value })}
                    className="input-field !py-1.5 !px-2.5 text-sm mt-0.5"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[var(--text-muted)]">ยอดรวม (บาท)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={scanResult.totalAmount}
                      onChange={(e) =>
                        setScanResult({
                          ...scanResult,
                          totalAmount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input-field !py-1.5 !px-2.5 text-sm mt-0.5 font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[var(--text-muted)]">เวลา</span>
                    <input
                      type="time"
                      value={scanResult.time}
                      onChange={(e) => setScanResult({ ...scanResult, time: e.target.value })}
                      className="input-field !py-1.5 !px-2.5 text-sm mt-0.5"
                    />
                  </label>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={attachSlip}
                onChange={(e) => setAttachSlip(e.target.checked)}
                className="w-4 h-4 accent-[var(--primary-color)]"
              />
              <span>แนบรูปสลิปเก็บไว้ในเครื่อง (IndexedDB เท่านั้น ไม่ส่งขึ้น Sheets)</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="btn-secondary flex-1 !py-2 text-sm"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={applyScanResult}
                className="btn-primary flex-1 !py-2 text-sm"
              >
                <FiCheck size={16} />
                นำข้อมูลใส่ฟอร์ม
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Transaction Form */}
      <div className="card p-4 flex flex-col gap-4">
        {/* Type Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--card-border)]">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 rounded-lg text-sm font-semibold cursor-pointer transition ${
              type === 'expense'
                ? 'bg-[var(--primary-color)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
            }`}
          >
            รายจ่าย
          </button>
          <button
            type="button"
            onClick={() => setType('topup')}
            className={`py-2 rounded-lg text-sm font-semibold cursor-pointer transition ${
              type === 'topup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
            }`}
          >
            เติมเงิน
          </button>
        </div>

        {/* Amount + Quick Chips */}
        <div>
          <label htmlFor="tx-amount" className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            จำนวนเงิน (บาท)
          </label>
          <input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="input-field text-3xl font-bold tabular-nums !py-3"
          />

          <div className="flex flex-wrap gap-1.5 mt-2">
            {[20, 50, 100, 200, 500].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(roundMoney((parseFloat(amount) || 0) + v).toString())}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-muted)] border border-[var(--card-border)] hover:border-[var(--primary-color)] cursor-pointer tabular-nums"
              >
                +{v}
              </button>
            ))}
            {type === 'expense' && maxSpendUsingFullDailyQuota > 0 && (
              <button
                type="button"
                onClick={() => setAmount(maxSpendUsingFullDailyQuota.toString())}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-[var(--primary-color)] border border-blue-500/30 hover:bg-blue-500/20 cursor-pointer tabular-nums"
              >
                เต็มสิทธิ์วันนี้ ({formatMoney(maxSpendUsingFullDailyQuota)} ฿)
              </button>
            )}
          </div>
        </div>

        {/* Live Split Calculation Card */}
        {type === 'expense' && numAmount > 0 && (
          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2 text-sm tabular-nums">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                รัฐช่วยจ่าย ({isWithinPeriod ? settings.supportRatioGov : 0}%)
              </span>
              <span className="font-bold text-[var(--primary-color)]">
                {formatMoney(govAmount)} บาท
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">เราจ่ายเอง</span>
              <span className={`font-bold ${!isWalletSufficient ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                {formatMoney(userAmount)} บาท
              </span>
            </div>

            {!isWalletSufficient && (
              <div className="flex items-start gap-2 pt-1 text-rose-600 dark:text-rose-400 text-xs">
                <FiAlertCircle className="shrink-0 mt-0.5" size={14} />
                <span>
                  ยอดเงินในกระเป๋าไม่พอ (มี {formatMoney(effectiveWalletBalance)} บาท)
                </span>
              </div>
            )}

            {!isWithinPeriod && (
              <div className="flex items-start gap-2 pt-1 text-amber-600 dark:text-amber-400 text-xs">
                <FiAlertCircle className="shrink-0 mt-0.5" size={14} />
                <span>วันที่เลือกอยู่นอกช่วงโครงการที่ตั้งไว้ รัฐจะไม่ช่วยจ่ายในรายการนี้</span>
              </div>
            )}

            {isWithinPeriod &&
              govAmount < roundMoney((numAmount * settings.supportRatioGov) / 100) && (
                <div className="flex items-start gap-2 pt-1 text-amber-600 dark:text-amber-400 text-xs">
                  <FiAlertCircle className="shrink-0 mt-0.5" size={14} />
                  <span>
                    {govAmount === 0
                      ? 'สิทธิ์รัฐบาลของวันที่เลือกหมดแล้ว (หักจากกระเป๋าเราทั้งหมด)'
                      : 'สิทธิ์รัฐบาลคงเหลือไม่พอตามสัดส่วนปกติ ส่วนต่างถูกหักจากกระเป๋าเรา'}
                  </span>
                </div>
              )}
          </div>
        )}

        {/* Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="tx-title" className="text-xs font-semibold text-[var(--text-muted)]">
              ชื่อรายการ
            </label>
            {type === 'expense' && !editId && (
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="text-xs font-semibold text-[var(--primary-color)] inline-flex items-center gap-1 cursor-pointer hover:underline"
              >
                <FiBookmark size={12} /> บันทึกเป็นรายการประจำ
              </button>
            )}
          </div>
          <input
            id="tx-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'expense' ? 'เช่น ซื้อข้าว, กาแฟ' : 'เช่น เติมเงินเป๋าตัง'}
            list="title-suggestions"
            className="input-field"
          />
          <datalist id="title-suggestions">
            {recentTitles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        {/* Categories */}
        {type === 'expense' && (
          <div>
            <span className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
              หมวดหมู่
            </span>
            <div className="grid grid-cols-2 gap-2">
              {activeCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium cursor-pointer transition border ${
                    category === cat
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                      : 'bg-[var(--surface-muted)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--primary-color)]/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date & Time */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            วันที่ และ เวลา
          </label>
          <div className="flex gap-2 items-center">
            <input
              aria-label="วันที่"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field flex-[1.4]"
            />
            <input
              aria-label="เวลา"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setDate(format(now, 'yyyy-MM-dd'));
                setTime(format(now, 'HH:mm'));
              }}
              aria-label="ตั้งเป็นเวลาปัจจุบัน"
              title="ตอนนี้"
              className="btn-secondary !p-2.5 shrink-0"
            >
              <FiClock size={18} />
            </button>
          </div>
        </div>

        {/* Note */}
        <div>
          <label htmlFor="tx-note" className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
            หมายเหตุ
          </label>
          <textarea
            id="tx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            rows={2}
            className="input-field resize-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            disabled={!isFormValid || !isWalletSufficient}
            onClick={() => void saveTransactionRecord(false)}
            className="btn-primary flex-1 !py-3.5 text-base"
          >
            {editId ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
          </button>

          {!editId && (
            <button
              type="button"
              disabled={!isFormValid || !isWalletSufficient}
              onClick={() => void saveTransactionRecord(true)}
              className="btn-secondary !py-3.5 text-sm"
            >
              บันทึกแล้วเพิ่มต่อ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
