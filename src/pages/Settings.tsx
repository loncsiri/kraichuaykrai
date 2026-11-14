import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCloud,
  FiDatabase,
  FiDownload,
  FiMonitor,
  FiMoon,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiSliders,
  FiSun,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { useAppStore, type Settings as ISettings, type ThemeMode } from '../store/useAppStore';
import {
  createJsonBackup,
  exportTransactionsToCSV,
  parseCSVTransactions,
  parseJsonBackup,
  type CsvParseResult,
  type FullBackupData,
} from '../utils/csv';
import { formatMoney } from '../utils/money';
import { clearAllSlipImages, getSlipStorageStats } from '../utils/slipStorage';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/toastContext';

type SettingsTab = 'project' | 'preferences' | 'sync' | 'data';

export const Settings: React.FC = () => {
  const store = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('project');
  const [draft, setDraft] = useState<ISettings>({
    ...store.settings,
    categories:
      store.settings.categories?.length > 0
        ? store.settings.categories
        : ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'],
  });
  const [newCat, setNewCat] = useState('');

  // Slip storage stats
  const [slipStats, setSlipStats] = useState<{ count: number; totalBytes: number }>({
    count: 0,
    totalBytes: 0,
  });

  // Modals state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    variant: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<CsvParseResult | null>(null);
  const [jsonPreview, setJsonPreview] = useState<FullBackupData | null>(null);

  useEffect(() => {
    void getSlipStorageStats().then(setSlipStats);
  }, [activeTab]);

  const handleSaveProject = () => {
    store.updateSettings(draft);
    showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
  };

  const addCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (!draft.categories.includes(trimmed)) {
      setDraft((s) => ({ ...s, categories: [...s.categories, trimmed] }));
      setNewCat('');
    }
  };

  const removeCategory = (cat: string) => {
    setDraft((s) => ({ ...s, categories: s.categories.filter((c) => c !== cat) }));
  };

  const handleExportCSV = () => {
    const csvContent = exportTransactionsToCSV(store.transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ใครช่วยใครพลัส-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success');
  };

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const result = parseCSVTransactions(text);
        if (result.valid.length === 0 && result.errors.length === 0) {
          showToast('ไม่พบข้อมูลในไฟล์ CSV', 'warning');
          return;
        }
        setCsvPreview(result);
      } catch {
        showToast('อ่านไฟล์ CSV ไม่สำเร็จ', 'error');
      }
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportJSON = () => {
    const json = createJsonBackup({
      settings: store.settings,
      transactions: store.transactions,
      templates: store.templates,
    });
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kraichuaykrai-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('สำรองข้อมูลทั้งหมด (JSON) สำเร็จ', 'success');
  };

  const handleJSONFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseJsonBackup(String(ev.target?.result || ''));
        setJsonPreview(parsed);
      } catch {
        showToast('ไฟล์สำรอง JSON ไม่ถูกต้อง', 'error');
      }
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const validateGoogleConfig = (): boolean => {
    if (!store.googleSheetUrl || !store.googleSecretKey) {
      showToast('กรุณากรอก URL และ Secret Key ก่อน', 'warning');
      return false;
    }
    if (store.googleSecretKey === 'kraichuaykrai-secret-1234') {
      showToast('ไม่อนุญาตให้ใช้ Secret Key เริ่มต้น กรุณาเปลี่ยนรหัสใน Apps Script', 'error');
      return false;
    }
    return true;
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'project', label: 'โครงการ', icon: <FiSliders size={15} /> },
    { id: 'preferences', label: 'ทั่วไป', icon: <FiShield size={15} /> },
    { id: 'sync', label: 'Google Sheets', icon: <FiCloud size={15} /> },
    { id: 'data', label: 'สำรองข้อมูล', icon: <FiDatabase size={15} /> },
  ];

  const isWeakSecret =
    store.googleSecretKey.length > 0 &&
    (store.googleSecretKey.length < 12 || store.googleSecretKey === 'kraichuaykrai-secret-1234');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold text-xl">การตั้งค่า</h2>

      {/* Section Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer transition ${
              activeTab === tab.id
                ? 'bg-[var(--primary-color)] text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: Project & Categories & Templates */}
      {activeTab === 'project' && (
        <div className="flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-4">
            <h3 className="font-bold text-base text-[var(--primary-color)]">
              ตั้งค่าโครงการและโควตา
            </h3>

            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] block mb-1.5">
                สัดส่วน รัฐ : เรา (%)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[var(--text-muted)]">รัฐช่วย (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.supportRatioGov}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setDraft({ ...draft, supportRatioGov: val, supportRatioUser: 100 - val });
                    }}
                    className="input-field mt-1 tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--text-muted)]">เราจ่าย (%)</span>
                  <input
                    type="number"
                    value={draft.supportRatioUser}
                    disabled
                    className="input-field mt-1 opacity-60 tabular-nums"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  งบรัฐต่อเดือน (บาท)
                </span>
                <input
                  type="number"
                  value={draft.monthlySupportAmount}
                  onChange={(e) =>
                    setDraft({ ...draft, monthlySupportAmount: parseFloat(e.target.value) || 0 })
                  }
                  className="input-field mt-1 tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  ลิมิตต่อวัน (บาท)
                </span>
                <input
                  type="number"
                  value={draft.dailySupportLimit}
                  onChange={(e) =>
                    setDraft({ ...draft, dailySupportLimit: parseFloat(e.target.value) || 0 })
                  }
                  className="input-field mt-1 tabular-nums"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">เดือนที่เริ่ม</span>
                <input
                  type="month"
                  value={draft.periodStart}
                  onChange={(e) => setDraft({ ...draft, periodStart: e.target.value })}
                  className="input-field mt-1"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  เดือนที่สิ้นสุด
                </span>
                <input
                  type="month"
                  value={draft.periodEnd}
                  onChange={(e) => setDraft({ ...draft, periodEnd: e.target.value })}
                  className="input-field mt-1"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                ยอดเงินตั้งต้นในกระเป๋า (บาท) — ใช้ปรับยอดยกมาโดยไม่ต้องสร้างรายการเติมเงินปลอม
              </span>
              <input
                type="number"
                step="0.01"
                value={draft.openingBalance}
                onChange={(e) =>
                  setDraft({ ...draft, openingBalance: parseFloat(e.target.value) || 0 })
                }
                className="input-field mt-1 tabular-nums"
              />
            </label>

            <div>
              <span className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
                หมวดหมู่ค่าใช้จ่าย
              </span>
              <div className="flex flex-wrap gap-2 mb-3">
                {draft.categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--surface-muted)] border border-[var(--card-border)]"
                  >
                    {cat}
                    <button
                      type="button"
                      aria-label={`ลบหมวดหมู่ ${cat}`}
                      onClick={() => removeCategory(cat)}
                      className="text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      <FiX size={13} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="เพิ่มหมวดหมู่ใหม่..."
                  className="input-field flex-1 !py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  aria-label="เพิ่มหมวดหมู่"
                  className="btn-primary !px-3.5"
                >
                  <FiPlus size={18} />
                </button>
              </div>
            </div>

            <button type="button" onClick={handleSaveProject} className="btn-primary w-full !py-3">
              <FiSave size={17} />
              บันทึกการตั้งค่าโครงการ
            </button>
          </div>

          {/* Saved Templates */}
          {store.templates.length > 0 && (
            <div className="card p-4">
              <h3 className="font-bold text-base mb-3">รายการประจำที่บันทึกไว้</h3>
              <div className="flex flex-col gap-2">
                {store.templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] border border-[var(--card-border)] text-sm"
                  >
                    <div>
                      <div className="font-semibold">{tpl.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {tpl.category} · {formatMoney(tpl.amount)} บาท
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`ลบรายการประจำ ${tpl.title}`}
                      onClick={() => {
                        store.deleteTemplate(tpl.id);
                        showToast('ลบรายการประจำแล้ว', 'info');
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Preferences & Privacy */}
      {activeTab === 'preferences' && (
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="font-bold text-base mb-3 text-[var(--primary-color)]">ธีมการแสดงผล</h3>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['system', 'ตามระบบ', <FiMonitor size={18} key="sys" />],
                  ['light', 'สว่าง', <FiSun size={18} key="light" />],
                  ['dark', 'มืด', <FiMoon size={18} key="dark" />],
                ] as [ThemeMode, string, React.ReactNode][]
              ).map(([mode, label, icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => store.setTheme(mode)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-semibold border cursor-pointer transition ${
                    store.settings.theme === mode
                      ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                      : 'bg-[var(--surface-muted)] text-[var(--text-color)] border-[var(--card-border)]'
                  }`}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4 flex flex-col gap-3">
            <h3 className="font-bold text-base text-[var(--primary-color)]">
              ความเป็นส่วนตัว & รูปสลิปในเครื่อง
            </h3>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <div className="text-sm font-semibold">บันทึกรูปสลิปไว้เป็นหลักฐานอัตโนมัติ</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  บีบอัดและเก็บใน IndexedDB ของอุปกรณ์นี้เท่านั้น ไม่เคยส่งขึ้น Google Sheets หรือเซิร์ฟเวอร์
                </div>
              </div>
              <input
                type="checkbox"
                checked={store.settings.saveSlipLocally}
                onChange={(e) => store.updateSettings({ saveSlipLocally: e.target.checked })}
                className="w-5 h-5 mt-0.5 accent-[var(--primary-color)] shrink-0"
              />
            </label>

            <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--card-border)] flex items-center justify-between text-xs">
              <span>
                รูปสลิปที่เก็บไว้: <strong>{slipStats.count}</strong> รูป (
                {(slipStats.totalBytes / 1024).toFixed(1)} KB)
              </span>
              {slipStats.count > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      title: 'ลบรูปสลิปทั้งหมดในเครื่อง?',
                      description:
                        'รูปสลิปที่เก็บไว้ใน IndexedDB จะถูกลบทั้งหมด แต่รายการบัญชีจะยังอยู่ครบ',
                      confirmLabel: 'ลบรูปสลิป',
                      variant: 'danger',
                      onConfirm: async () => {
                        setConfirmState(null);
                        await clearAllSlipImages();
                        setSlipStats({ count: 0, totalBytes: 0 });
                        showToast('ลบรูปสลิปทั้งหมดแล้ว', 'info');
                      },
                    })
                  }
                  className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer hover:underline"
                >
                  ล้างรูปสลิป
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Google Sheets Sync */}
      {activeTab === 'sync' && (
        <div className="card p-4 flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-base text-[var(--primary-color)]">
              เชื่อมต่อ Google Sheets
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              สำรองและซิงค์รายการไปยัง Google Sheets ส่วนตัวผ่าน Apps Script (
              <a
                href="https://github.com/loncsiri/kraichuaykrai/blob/main/docs/google-apps-script-template.js"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--primary-color)] underline"
              >
                ดูโค้ด Apps Script ล่าสุด
              </a>
              )
            </p>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-semibold">เปิดใช้งานการซิงค์อัตโนมัติ</span>
            <input
              type="checkbox"
              checked={store.googleSheetsEnabled}
              onChange={(e) =>
                store.setGoogleSheetsConfig(
                  store.googleSheetUrl,
                  store.googleSecretKey,
                  e.target.checked
                )
              }
              className="w-5 h-5 accent-[var(--primary-color)]"
            />
          </label>

          {store.googleSheetsEnabled && (
            <>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <FiAlertTriangle className="shrink-0 mt-0.5" size={15} />
                <span>
                  Secret Key ถูกเก็บใน localStorage ของเบราว์เซอร์นี้ ควรใช้เฉพาะบนอุปกรณ์ส่วนตัวของคุณเท่านั้น
                </span>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Apps Script Web App URL
                </span>
                <input
                  type="url"
                  value={store.googleSheetUrl}
                  onChange={(e) =>
                    store.setGoogleSheetsConfig(
                      e.target.value,
                      store.googleSecretKey,
                      store.googleSheetsEnabled
                    )
                  }
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="input-field mt-1 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Secret Key</span>
                <input
                  type="password"
                  value={store.googleSecretKey}
                  onChange={(e) =>
                    store.setGoogleSheetsConfig(
                      store.googleSheetUrl,
                      e.target.value,
                      store.googleSheetsEnabled
                    )
                  }
                  placeholder="รหัสลับที่ตั้งไว้ใน Apps Script"
                  className="input-field mt-1 text-sm"
                />
                {isWeakSecret && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 block">
                    แนะนำให้ตั้ง Secret Key อย่างน้อย 12 ตัวอักษร และห้ามใช้รหัสเริ่มต้น
                  </span>
                )}
              </label>

              {/* Status & Queue Info */}
              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--card-border)] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">ซิงค์สำเร็จล่าสุด:</span>
                  <span className="font-medium">
                    {store.lastSyncedAt
                      ? format(parseISO(store.lastSyncedAt), 'd MMM yy HH:mm', { locale: th })
                      : 'ยังไม่เคยซิงค์'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">คิวรอซิงค์ (ออฟไลน์):</span>
                  <span className="font-semibold">
                    {store.syncQueue.length > 0
                      ? `${store.syncQueue.length} รายการ`
                      : 'ไม่มีค้าง'}
                  </span>
                </div>
              </div>

              {store.syncQueue.length > 0 && (
                <button
                  type="button"
                  onClick={() => void store.flushSyncQueue()}
                  disabled={store.syncStatus === 'syncing'}
                  className="btn-primary w-full !py-2.5 text-sm"
                >
                  <FiRefreshCw className={store.syncStatus === 'syncing' ? 'animate-spin' : ''} />
                  ส่งคิวที่ค้างทั้งหมด ({store.syncQueue.length} รายการ)
                </button>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={store.syncStatus === 'syncing'}
                  onClick={async () => {
                    if (!validateGoogleConfig()) return;
                    const res = await store.pullFromGoogleSheets('merge');
                    if (res) {
                      showToast(
                        `ผสานข้อมูลสำเร็จ (เพิ่ม ${res.added}, อัปเดต ${res.updated})`,
                        'success'
                      );
                    }
                  }}
                  className="btn-primary w-full !py-2.5 text-sm"
                >
                  ดึงและผสานข้อมูลจาก Sheets (แนะนำ · ไม่ทับของใหม่ในเครื่อง)
                </button>

                <button
                  type="button"
                  disabled={store.syncStatus === 'syncing'}
                  onClick={() => {
                    if (!validateGoogleConfig()) return;
                    setConfirmState({
                      open: true,
                      title: 'ดึงข้อมูลมาทับในเครื่องทั้งหมด?',
                      description:
                        'รายการทั้งหมดในเครื่องจะถูกแทนที่ด้วยข้อมูลจาก Google Sheets ทันที',
                      confirmLabel: 'ดึงทับทั้งหมด',
                      variant: 'danger',
                      onConfirm: async () => {
                        setConfirmState(null);
                        const res = await store.pullFromGoogleSheets('replace');
                        if (res) showToast(`ดึงข้อมูลทั้งหมด ${res.total} รายการแล้ว`, 'success');
                      },
                    });
                  }}
                  className="btn-secondary w-full !py-2.5 text-sm"
                >
                  ดึงข้อมูลจาก Sheets (เขียนทับข้อมูลในเครื่อง)
                </button>

                <button
                  type="button"
                  disabled={store.syncStatus === 'syncing'}
                  onClick={() => {
                    if (!validateGoogleConfig()) return;
                    setConfirmState({
                      open: true,
                      title: 'ส่งข้อมูลทั้งหมดขึ้น Google Sheets?',
                      description:
                        'ข้อมูลใน Google Sheets จะถูกเขียนทับด้วยรายการปัจจุบันในเครื่องของคุณ',
                      confirmLabel: 'ส่งขึ้น Sheets',
                      variant: 'primary',
                      onConfirm: async () => {
                        setConfirmState(null);
                        await store.syncAllToGoogleSheets();
                        showToast('ซิงค์ข้อมูลทั้งหมดขึ้น Google Sheets แล้ว', 'success');
                      },
                    });
                  }}
                  className="btn-secondary w-full !py-2.5 text-sm"
                >
                  ส่งข้อมูลในเครื่องขึ้น Google Sheets (เขียนทับ)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      open: true,
                      title: 'ล้างการเชื่อมต่อ Google Sheets?',
                      description:
                        'จะลบ URL, Secret Key และคิวซิงค์ที่ค้างออกจากเครื่องนี้ (ข้อมูลรายการบัญชีไม่หาย)',
                      confirmLabel: 'ล้างการเชื่อมต่อ',
                      variant: 'danger',
                      onConfirm: () => {
                        setConfirmState(null);
                        store.clearGoogleSheetsConfig();
                        showToast('ล้างข้อมูลการเชื่อมต่อแล้ว', 'info');
                      },
                    })
                  }
                  className="text-xs text-rose-600 dark:text-rose-400 font-semibold py-2 cursor-pointer hover:underline"
                >
                  ล้างข้อมูลเชื่อมต่อและ Secret Key ออกจากเครื่อง
                </button>
              </div>

              {store.syncStatus === 'error' && (
                <div className="text-xs text-rose-600 dark:text-rose-400 text-center">
                  {store.syncError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 4: CSV & JSON Backup & Clear */}
      {activeTab === 'data' && (
        <div className="flex flex-col gap-4">
          <div className="card p-4 flex flex-col gap-3">
            <h3 className="font-bold text-base text-[var(--primary-color)]">
              นำเข้า / ส่งออก CSV
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              รองรับการเปิดใน Excel (UTF-8 BOM) และเก็บสัดส่วน รัฐ:เรา ครบทุกคอลัมน์{' '}
              <a
                href="/sample-import.csv"
                download
                className="text-[var(--primary-color)] underline font-semibold"
              >
                โหลดไฟล์ตัวอย่าง CSV
              </a>
            </p>

            <input
              type="file"
              accept=".csv,text/csv"
              ref={csvInputRef}
              onChange={handleCSVFileSelect}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 !py-2.5 text-sm"
              >
                <FiDownload size={16} /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="btn-secondary !py-2.5 text-sm"
              >
                <FiUpload size={16} /> Import CSV
              </button>
            </div>
          </div>

          <div className="card p-4 flex flex-col gap-3">
            <h3 className="font-bold text-base text-[var(--primary-color)]">
              สำรองข้อมูลเต็มรูปแบบ (JSON)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              รวมการตั้งค่าโครงการ, หมวดหมู่, รายการประจำ และประวัติรายการทั้งหมดไว้ในไฟล์เดียว
            </p>
            <input
              type="file"
              accept=".json,application/json"
              ref={jsonInputRef}
              onChange={handleJSONFileSelect}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={handleExportJSON} className="btn-primary !py-2.5 text-sm">
                <FiDownload size={16} /> สำรอง JSON
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="btn-secondary !py-2.5 text-sm"
              >
                <FiUpload size={16} /> กู้คืน JSON
              </button>
            </div>
          </div>

          <div className="card p-4 border-rose-500/40">
            <h3 className="font-bold text-base text-rose-600 dark:text-rose-400 mb-2">
              พื้นที่อันตราย
            </h3>
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  open: true,
                  title: 'ลบข้อมูลทั้งหมดในเครื่อง?',
                  description:
                    'ประวัติรายการ, รายการประจำ, รูปสลิป และตั้งค่าโครงการจะถูกรีเซ็ตทั้งหมด (ไม่สามารถกู้คืนได้)',
                  confirmLabel: 'ลบข้อมูลทั้งหมด',
                  variant: 'danger',
                  onConfirm: () => {
                    setConfirmState(null);
                    store.clearData();
                    setDraft(useAppStore.getState().settings);
                    showToast('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว', 'info');
                  },
                })
              }
              className="w-full py-2.5 px-4 rounded-xl border border-rose-500/50 text-rose-600 dark:text-rose-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose-500/10 cursor-pointer"
            >
              <FiTrash2 size={16} /> ลบข้อมูลทั้งหมดในเครื่อง
            </button>
          </div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {csvPreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ตรวจสอบข้อมูลก่อนนำเข้า CSV"
        >
          <div className="card w-full max-w-md p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">ตรวจสอบไฟล์ CSV</h3>
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                aria-label="ปิด"
                className="p-1 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="text-sm space-y-2 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
                พบรายการที่ถูกต้องพร้อมนำเข้า: <strong>{csvPreview.valid.length}</strong> รายการ
              </div>
              {csvPreview.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs space-y-1 max-h-36 overflow-y-auto">
                  <div className="font-bold">พบแถวที่ไม่ถูกต้อง ({csvPreview.errors.length} แถว):</div>
                  {csvPreview.errors.slice(0, 10).map((err, i) => (
                    <div key={i}>
                      แถว {err.row}: {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {csvPreview.valid.length > 0 ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const res = store.mergeTransactions(csvPreview.valid);
                    setCsvPreview(null);
                    showToast(
                      `ผสานข้อมูลแล้ว (เพิ่ม ${res.added}, อัปเดต ${res.updated}, ข้าม ${res.skipped})`,
                      'success'
                    );
                  }}
                  className="btn-primary w-full text-sm"
                >
                  ผสานข้อมูล (เพิ่มเฉพาะรายการใหม่ · แนะนำ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    store.importData({ transactions: csvPreview.valid });
                    setCsvPreview(null);
                    showToast(`นำเข้าและเขียนทับ ${csvPreview.valid.length} รายการแล้ว`, 'success');
                  }}
                  className="btn-secondary w-full text-sm text-rose-600 dark:text-rose-400"
                >
                  เขียนทับรายการเดิมทั้งหมด
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="btn-secondary w-full"
              >
                ปิด
              </button>
            )}
          </div>
        </div>
      )}

      {/* JSON Backup Restore Modal */}
      {jsonPreview && (
        <ConfirmModal
          open={true}
          title="กู้คืนข้อมูลจากไฟล์ JSON?"
          description={`พบรายการ ${jsonPreview.transactions.length} รายการ และรายการประจำ ${jsonPreview.templates.length} รายการ (สำรองเมื่อ ${format(parseISO(jsonPreview.exportedAt), 'd MMM yyyy HH:mm', { locale: th })})\n\nการกู้คืนจะเขียนทับการตั้งค่าและรายการในเครื่องปัจจุบัน`}
          confirmLabel="กู้คืนข้อมูล"
          variant="danger"
          onConfirm={() => {
            store.importData({
              settings: jsonPreview.settings,
              transactions: jsonPreview.transactions,
              templates: jsonPreview.templates,
            });
            setDraft(useAppStore.getState().settings);
            setJsonPreview(null);
            showToast('กู้คืนข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
          }}
          onCancel={() => setJsonPreview(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          variant={confirmState.variant}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
