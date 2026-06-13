<div align="center">
  <img src="public/icon.svg" width="120" alt="ใครช่วยใครพลัส Icon" />
  <h1>ใครช่วยใครพลัส (KraiChuayKrai Plus)</h1>
  <p>A smart, privacy-first local finance tracker / แอปจัดการเงินและสิทธิ์คนละครึ่งสุดฉลาด ที่ให้ความสำคัญกับความเป็นส่วนตัวของคุณ</p>
</div>

<br />

---

## 🇹🇭 ภาษาไทย

**ใครช่วยใครพลัส (KraiChuayKrai Plus)** เป็นเว็บแอปพลิเคชัน (PWA) สำหรับจดบันทึกรายรับรายจ่าย ที่ออกแบบมาโดยเฉพาะเพื่อรองรับการใช้งานแบบ **"รัฐช่วยจ่าย / เราจ่ายเอง"** (อารมณ์โครงการคนละครึ่ง) พร้อมระบบสแกนสลิปอัตโนมัติด้วย AI ที่ประมวลผลบนเครื่องของคุณ 100% โดยไม่มีการส่งข้อมูลใดๆ ออกสู่อินเทอร์เน็ต!

### ✨ ฟีเจอร์หลัก (Features)
- **📊 แดชบอร์ดสรุปยอด:** ติดตามโควตาเงินรัฐบาลรายวันและรายเดือนได้แบบ Real-time พร้อมแถบ Progress bar แจ้งเตือนสัดส่วนเงิน
- **🧾 สแกนสลิปโอนเงินอัตโนมัติ (Auto Slip Scanner):** เพียงอัปโหลดรูปสลิป แอปจะดึงยอดเงิน วันที่ และเวลา ออกมาให้อัตโนมัติ (ใช้ Tesseract.js)
- **☁️ เชื่อมต่อ Google Sheets (Cloud Sync):** แบ็คอัปและซิงค์ข้อมูลกับ Google Sheets ส่วนตัวอัตโนมัติ (ผ่าน Apps Script)
- **📂 นำเข้า/ส่งออกข้อมูล (CSV):** สามารถ Export ประวัติเป็นไฟล์ CSV หรือ Import ข้อมูลจากภายนอกกลับเข้ามาในระบบได้
- **⚙️ ปรับแต่งได้อิสระ:** ตั้งค่าสัดส่วนรัฐ:เรา, ยอดจำกัดต่อวัน/เดือน, เพิ่ม/ลบหมวดหมู่ค่าใช้จ่าย และระยะเวลาโครงการได้ด้วยตัวเอง
- **🔒 ความเป็นส่วนตัวขั้นสูงสุด (100% Local-First):** ข้อมูลประวัติการใช้งานและรูปสลิป จะถูกประมวลผลและเก็บอยู่ใน Browser ของคุณ (เว้นแต่คุณจะเปิดใช้งาน Google Sheets Sync)
- **📱 รองรับ PWA (Progressive Web App):** สามารถกด Add to Home Screen บนมือถือ iOS/Android ใช้งานเหมือนแอปพลิเคชันได้ทันที
- **🎨 ดีไซน์สวยงามใช้งานง่าย:** รองรับทั้ง Light/Dark mode อัตโนมัติตามระบบปฏิบัติการ พร้อม UI แบบ Glassmorphism  

### 🛠 ข้อมูลทางเทคนิค (Technical Stack)
- **Frontend Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (พร้อม Persist middleware สำหรับเซฟลง Local Storage)
- **Routing:** React Router v6
- **Styling:** Custom CSS พร้อมระบบ Design Token และ Utility classes
- **OCR (Optical Character Recognition):** Tesseract.js (รันบน Client-side 100%)
- **Icons & Formatting:** React Icons, date-fns

### 🛡 ความปลอดภัย (Security)
แอปพลิเคชันนี้ถูกออกแบบมาแบบ **Zero-Backend** หมายความว่า:
1. **ไม่มีฐานข้อมูลบนเซิร์ฟเวอร์:** ไม่มีการเก็บข้อมูลการเงินของคุณไว้ที่ส่วนกลาง
2. **รูปสลิปไม่เคยหลุดไปอินเทอร์เน็ต:** การทำ OCR สกัดข้อความจากสลิป เกิดขึ้นในหน่วยความจำ RAM ของอุปกรณ์คุณ (Client-side execution) ทันทีที่อ่านเสร็จ รูปจะถูกทิ้งทันที
3. **การล้างข้อมูล:** หากคุณล้างข้อมูลประวัติการท่องเว็บ (Clear Browsing Data) ข้อมูลแอปจะถูกรีเซ็ตใหม่ทั้งหมด

### 🚀 วิธีการติดตั้งและรันในเครื่อง (How to Use locally)
1. โคลนโปรเจกต์นี้ลงมาที่เครื่อง `git clone https://github.com/loncsiri/kraichuaykrai.git`
2. เข้าไปที่โฟลเดอร์โปรเจกต์ `cd kraichuaykrai`
3. ติดตั้ง Dependencies `npm install`
4. รันเซิร์ฟเวอร์จำลอง `npm run dev`
5. เปิดเบราว์เซอร์และเข้าไปที่ `http://localhost:5173`

---

## 🇬🇧 English

**KraiChuayKrai Plus** is a local-first, Progressive Web App (PWA) designed for tracking daily/monthly personal finances, specifically optimized for co-payment schemes (e.g., Government subsidy / User payment). It comes with a built-in auto slip scanner powered by client-side AI.

### ✨ Features
- **📊 Dashboard Overview:** Track daily and monthly subsidies, purchase limits, and actual wallet balances with intuitive progress bars.
- **🧾 Auto Slip Scanner:** Upload a payment slip and instantly extract the total amount, date, and time via OCR (Powered by Tesseract.js).
- **☁️ Google Sheets Sync:** Connect your private Google Sheet to automatically back up and sync your transactions.
- **📂 CSV Import/Export:** Easily download your transaction history or restore data from a CSV file.
- **⚙️ Flexible Configuration:** Customize expense categories, co-pay ratios, daily/monthly limits, and project durations to fit any scheme.
- **🔒 Absolute Privacy (Local-First):** All your financial data and images are processed and stored exclusively on your device (unless Google Sheets sync is enabled).
- **📱 PWA Support:** Install it directly to your iOS/Android home screen for a native app-like experience.
- **🎨 Premium UI/UX:** Responsive glassmorphism design that fully supports system-level Light/Dark modes.

### 🛠 Technical Stack
- **Frontend:** React 18, TypeScript, Vite
- **State Management:** Zustand (with Persist middleware)
- **Routing:** React Router v6
- **Styling:** Custom CSS Design System
- **OCR:** Tesseract.js (Client-side execution)
- **Utils:** React Icons, date-fns

### 🛡 Security & Privacy
This application operates on a **Zero-Backend** architecture:
1. **No External Database:** Your financial records are never uploaded to any remote server.
2. **Client-Side OCR Processing:** The slip scanning process happens entirely within your device's memory. Images are never transmitted over the network.
3. **Data Ownership:** You maintain full control. Clearing your browser's local storage will permanently wipe the application's data.

### 🚀 Local Setup & Development
1. Clone the repository: `git clone https://github.com/loncsiri/kraichuaykrai.git`
2. Navigate to the directory: `cd kraichuaykrai`
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Open your browser at `http://localhost:5173`

---
*Deployed with ❤️ on [Vercel](https://vercel.com)*
