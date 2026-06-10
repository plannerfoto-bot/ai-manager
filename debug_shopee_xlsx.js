import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\Bigas\\NuvemShop - MCP - ANTIGRAVITY\\ai-manager\\Shopee_mass_upload_2026-04-07_basic_template.xlsx';

function debugExcel() {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        fs.writeFileSync('shopee_debug_rows.json', JSON.stringify(rows.slice(0, 15), null, 2));
        console.log('Shopee debug rows saved to shopee_debug_rows.json');
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

debugExcel();
