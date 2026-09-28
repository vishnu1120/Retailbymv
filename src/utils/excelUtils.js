import * as XLSX from "xlsx";
import { uid, clean, lower, n } from "./formatters";

/**
 * Parses an Excel (.xlsx / .xls) or CSV file into an array of object rows.
 * @param {File} file
 * @returns {Promise<Array<Object>>}
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(jsonRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exports an array of JSON objects to an Excel (.xlsx) file download.
 * @param {string} filename
 * @param {string} sheetName
 * @param {Array<Object>} data
 */
export function exportToExcel(filename = "Export.xlsx", sheetName = "Sheet1", data = []) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads a sample Stock Arrival Excel template (.xlsx).
 */
export function downloadStockArrivalTemplate() {
  const sampleData = [
    {
      "Distributor Name": "Apex Distributors",
      "Distributor GSTIN": "33ABCDE1234F1Z5",
      "Invoice No": "INV-2025-001",
      "Date": new Date().toISOString().split("T")[0],
      "Product Name": "Paracetamol 500mg",
      "Brand": "Apex Pharma",
      "Category": "Medicine",
      "Unit": "Box",
      "Barcode": "8901234567890",
      "NCode": "N1001",
      "Batch": "B-9910",
      "Expiry Date": "2026-12-31",
      "Quantity": 10,
      "Free Qty": 1,
      "Purchase Rate": 120,
      "MRP": 150,
      "GST %": 12,
      "Product Discount %": 5,
    },
    {
      "Distributor Name": "Apex Distributors",
      "Distributor GSTIN": "33ABCDE1234F1Z5",
      "Invoice No": "INV-2025-001",
      "Date": new Date().toISOString().split("T")[0],
      "Product Name": "Vitamin C 1000mg",
      "Brand": "NutriLife",
      "Category": "Supplements",
      "Unit": "Bottle",
      "Barcode": "8901234567891",
      "NCode": "N1002",
      "Batch": "B-9911",
      "Expiry Date": "2027-06-30",
      "Quantity": 20,
      "Free Qty": 0,
      "Purchase Rate": 250,
      "MRP": 320,
      "GST %": 18,
      "Product Discount %": 0,
    },
  ];

  exportToExcel("Stock_Arrival_Template.xlsx", "Stock Arrival", sampleData);
}

/**
 * Normalizes Excel row keys for flexible column matching.
 */
export function findRowValue(row, ...keys) {
  for (const k of keys) {
    const targetKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedKey = Object.keys(row).find(
      (rk) => rk.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === targetKey
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") {
      const val = row[matchedKey];
      if (val instanceof Date) {
        return val.toISOString().split("T")[0];
      }
      return String(val).trim();
    }
  }
  return "";
}
