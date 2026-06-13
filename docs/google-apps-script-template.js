/**
 * Google Apps Script for Kraichuaykrai+ (ใครช่วยใครพลัส)
 * 
 * 1. วางโค้ดนี้ลงใน Apps Script ของ Google Sheets (Extensions > Apps Script)
 * 2. เปลี่ยน SECRET_KEY ด้านล่างให้เป็นรหัสลับของคุณเอง (เพื่อป้องกันคนอื่นแอบยิงข้อมูล)
 * 3. กด Deploy > New deployment
 * 4. เลือกประเภท: Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. กด Deploy แล้ว Copy "Web app URL" ไปใส่ในแอป
 */

const SECRET_KEY = "kraichuaykrai-secret-1234"; // ⚠️ เปลี่ยนเป็นรหัสของคุณเอง
const SHEET_NAME = "Transactions";

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Create headers
    const headers = ["ID", "Timestamp", "Type", "Title", "TotalAmount", "GovAmount", "UserAmount", "Category", "Note"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
    
    // Set column formats
    sheet.getRange("B:B").setNumberFormat("yyyy-MM-dd HH:mm:ss");
    sheet.getRange("E:G").setNumberFormat("#,##0.00");
  }
  return sheet;
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return response(400, "No data provided");
    }

    const data = JSON.parse(e.postData.contents);

    // Verify secret key
    if (data.secretKey !== SECRET_KEY) {
      return response(401, "Unauthorized");
    }

    const sheet = setupSheet();
    const action = data.action;

    if (action === 'add') {
      return handleAdd(sheet, data.payload);
    } else if (action === 'update') {
      return handleUpdate(sheet, data.payload);
    } else if (action === 'delete') {
      return handleDelete(sheet, data.payload);
    } else if (action === 'sync') {
      return handleSyncAll(sheet, data.payload);
    } else {
      return response(400, "Invalid action");
    }

  } catch (error) {
    return response(500, error.toString());
  }
}

function handleAdd(sheet, tx) {
  sheet.appendRow([
    tx.id,
    tx.timestamp,
    tx.type,
    tx.title,
    tx.totalAmount,
    tx.govAmount,
    tx.userAmount,
    tx.category || "",
    tx.note || ""
  ]);
  return response(200, "Added successfully");
}

function handleUpdate(sheet, tx) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tx.id) {
      const row = i + 1;
      sheet.getRange(row, 1, 1, 9).setValues([[
        tx.id,
        tx.timestamp,
        tx.type,
        tx.title,
        tx.totalAmount,
        tx.govAmount,
        tx.userAmount,
        tx.category || "",
        tx.note || ""
      ]]);
      return response(200, "Updated successfully");
    }
  }
  return response(404, "Transaction not found");
}

function handleDelete(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      return response(200, "Deleted successfully");
    }
  }
  return response(404, "Transaction not found");
}

function handleSyncAll(sheet, transactions) {
  // Clear existing data (except header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).clearContent();
  }
  
  if (transactions && transactions.length > 0) {
    const rows = transactions.map(tx => [
      tx.id,
      tx.timestamp,
      tx.type,
      tx.title,
      tx.totalAmount,
      tx.govAmount,
      tx.userAmount,
      tx.category || "",
      tx.note || ""
    ]);
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }
  
  return response(200, "Synced successfully");
}

// Allow CORS preflight requests
function doOptions(e) {
  return response(200, "OK");
}

function doGet(e) {
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
