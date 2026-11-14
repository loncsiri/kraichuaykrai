/**
 * Google Apps Script for Kraichuaykrai+ (ใครช่วยใครพลัส)
 * 
 * 1. วางโค้ดนี้ลงใน Apps Script ของ Google Sheets (Extensions > Apps Script)
 * 2. เปลี่ยน SECRET_KEY ด้านล่างให้เป็นรหัสลับของคุณเอง (แนะนำ >= 12 ตัวอักษร)
 * 3. กด Deploy > New deployment (หรือ Manage deployments > Edit > New version)
 * 4. เลือกประเภท: Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. กด Deploy แล้ว Copy "Web app URL" ไปใส่ในแอป
 */

const SECRET_KEY = "kraichuaykrai-secret-1234"; // ⚠️ เปลี่ยนเป็นรหัสของคุณเอง
const SHEET_NAME = "Transactions";
const HEADERS = [
  "ID", "Timestamp", "Type", "Title", "TotalAmount",
  "GovAmount", "UserAmount", "GovRatio", "UserRatio",
  "Category", "Note", "UpdatedAt"
];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);

    sheet.getRange("B:B").setNumberFormat("yyyy-MM-dd HH:mm:ss");
    sheet.getRange("E:G").setNumberFormat("#,##0.00");
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // Upgrade existing 11-col sheet with UpdatedAt column safely
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return response(400, "No data provided");
    }

    const data = JSON.parse(e.postData.contents);

    if (data.secretKey !== SECRET_KEY) {
      return response(401, "Unauthorized");
    }
    if (SECRET_KEY === "kraichuaykrai-secret-1234") {
      return response(403, "Please change the default SECRET_KEY in Apps Script for your security.");
    }

    const sheet = setupSheet();
    const action = data.action;

    if (action === 'add') {
      return handleUpsert(sheet, data.payload);
    } else if (action === 'update') {
      return handleUpsert(sheet, data.payload);
    } else if (action === 'delete') {
      return handleDelete(sheet, data.payload);
    } else if (action === 'sync') {
      return handleSyncAll(sheet, data.payload);
    } else if (action === 'pull') {
      return handlePull(sheet);
    } else {
      return response(400, "Invalid action");
    }
  } catch (error) {
    return response(500, error.toString());
  }
}

function formatRow(tx) {
  const dateObj = tx.timestamp ? new Date(tx.timestamp) : new Date();
  const updatedAt = tx.updatedAt ? new Date(tx.updatedAt) : new Date();
  return [
    tx.id,
    dateObj,
    tx.type,
    tx.title,
    tx.totalAmount,
    tx.govAmount,
    tx.userAmount,
    tx.govRatio !== undefined ? tx.govRatio : "",
    tx.userRatio !== undefined ? tx.userRatio : "",
    tx.category || "",
    tx.note || "",
    updatedAt
  ];
}

// Idempotent upsert (prevents duplicate rows on offline queue retry)
function handleUpsert(sheet, tx) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tx.id) {
      const row = i + 1;
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([formatRow(tx)]);
      return response(200, "Updated successfully");
    }
  }
  sheet.appendRow(formatRow(tx));
  return response(200, "Added successfully");
}

function handleDelete(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      return response(200, "Deleted successfully");
    }
  }
  return response(200, "Already deleted");
}

function handleSyncAll(sheet, transactions) {
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).clearContent();
  }

  if (transactions && transactions.length > 0) {
    const active = transactions.filter(tx => !tx.deletedAt);
    if (active.length > 0) {
      const rows = active.map(formatRow);
      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    }
  }

  return response(200, "Synced successfully");
}

function handlePull(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return response(200, { transactions: [] });

  const transactions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    transactions.push({
      id: row[0],
      timestamp: row[1] instanceof Date ? row[1].toISOString() : row[1],
      type: row[2],
      title: row[3],
      totalAmount: Number(row[4]) || 0,
      govAmount: Number(row[5]) || 0,
      userAmount: Number(row[6]) || 0,
      govRatio: row[7] !== "" && row[7] !== undefined ? Number(row[7]) : undefined,
      userRatio: row[8] !== "" && row[8] !== undefined ? Number(row[8]) : undefined,
      category: row[9] || "",
      note: row[10] || "",
      updatedAt: row[11] instanceof Date ? row[11].toISOString() : (row[11] || undefined)
    });
  }
  return response(200, { transactions: transactions });
}

function doOptions() {
  return response(200, "OK");
}

function doGet() {
  return response(200, "Kraichuaykrai+ Google Sheets API is running");
}

function response(code, message) {
  const result = JSON.stringify({
    code: code,
    message: message
  });
  return ContentService.createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}
