<div align="center">
  <img src="public/icon.svg" width="120" alt="ใครช่วยใครพลัส Icon" />
  <h1>ใครช่วยใครพลัส (KraiChuayKrai Plus)</h1>
  <p>A privacy-first, offline-capable personal co-payment finance tracker (PWA)</p>
</div>

<br />

---

## 🇹🇭 ภาษาไทย

**ใครช่วยใครพลัส (KraiChuayKrai Plus)** เป็นเว็บแอปพลิเคชัน (PWA) แบบใช้งานออฟไลน์ได้จริง สำหรับจดบันทึกรายรับรายจ่ายและการใช้สิทธิ์ร่วมจ่ายแบบ **"รัฐช่วยจ่าย / เราจ่ายเอง"** ประมวลผลบนอุปกรณ์ของคุณ 100%

### ✨ ฟีเจอร์หลัก (Features)
- **📊 แดชบอร์ดสรุปสิทธิ์แบบ Real-time:** แสดงยอดสิทธิ์รัฐที่ใช้วันนี้ได้จริง ยอดซื้อสูงสุดที่แนะนำ เงินในกระเป๋าที่คำนวณตรงจากรายการจริง และนับถอยหลังระยะเวลาโครงการ พร้อมแจ้งเตือนเมื่อใช้สิทธิ์ใกล้เต็ม
- **📈 หน้าสรุปและวิเคราะห์ (Insights):** กราฟการใช้สิทธิ์ 14 วันล่าสุด แนวโน้มรายเดือน รัฐ vs เรา และสัดส่วนค่าใช้จ่ายแยกตามหมวดหมู่
- **🧾 สแกนสลิปออฟไลน์ 100% (Offline OCR):** ปรับความคมชัดและ EXIF orientation อัตโนมัติ (แก้ปัญหาสลิปจาก iPhone) รองรับทั้งสลิป G-Wallet/เป๋าตัง และสลิปโอนเงินธนาคาร พร้อมหน้าตรวจสอบผลก่อนบันทึก และตัวเลือกแนบรูปสลิปเก็บไว้ในเครื่อง (IndexedDB)
- **⚡ รายการประจำด่วน (Quick Templates):** บันทึกร้าน/เมนูที่ใช้บ่อย กดครั้งเดียวเพื่อสร้างรายการ
- **🔍 ค้นหาและกรองประวัติขั้นสูง:** ค้นหาตามชื่อ/หมายเหตุ กรองตามประเภท เดือน และหมวดหมู่
- **☁️ เชื่อมต่อ Google Sheets + Offline Queue:** ซิงค์อัตโนมัติ มีคิวรอส่งเมื่อออฟไลน์ และโหมดดึงข้อมูลแบบผสาน (Merge) ไม่ทับข้อมูลใหม่ในเครื่อง
- **📂 นำเข้า/ส่งออก CSV และ JSON Backup:** รองรับ RFC 4180 CSV เต็มรูปแบบ (พร้อมหน้าตรวจสอบ Preview และเลือก ผสาน/เขียนทับ) รวมถึงสำรอง/กู้คืนการตั้งค่าทั้งหมดด้วยไฟล์ JSON
- **📱 PWA & Self-hosted 100%:** มี `manifest.webmanifest`, Service Worker (แจ้งเตือนอัปเดตอัตโนมัติ), ฟอนต์ Sarabun และ Tesseract OCR data ในตัวเครื่องทั้งหมด ไม่เรียก CDN ภายนอก
- **🎨 ดีไซน์สะอาดตา รองรับ 3 โหมดธีม:** ตามระบบ (System) / สว่าง (Light) / มืด (Dark)

### 🛠 ข้อมูลทางเทคนิค (Technical Stack)
- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- **State Management:** Zustand (Modular Slices + Persist v2 Migration)
- **Precision:** คำนวณตัวเลขเงินทั้งหมดด้วยหน่วยสตางค์แบบจำนวนเต็ม (ป้องกันปัญหา Floating-point)
- **OCR:** Tesseract.js v7 (Self-hosted worker, WASM core, และ `tha`/`eng` traineddata) + Canvas Preprocessing
- **CSV / Storage:** PapaParse, IndexedDB (สำหรับรูปสลิปแบบ opt-in)
- **PWA & Testing:** `vite-plugin-pwa` (Workbox), Vitest, GitHub Actions CI

### 🚀 การรันในเครื่อง (Local Development)
```bash
git clone https://github.com/loncsiri/kraichuaykrai.git
cd kraichuaykrai
npm install
npm run dev
```

### 🧪 การตรวจสอบคุณภาพโค้ด
```bash
npm run typecheck
npm run lint
npm test
npm run build
```

---
*Deployed on [Vercel](https://vercel.com)*
