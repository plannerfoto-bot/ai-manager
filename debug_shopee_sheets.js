import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\Bigas\\NuvemShop - MCP - ANTIGRAVITY\\ai-manager\\Shopee_mass_upload_2026-04-07_basic_template.xlsx';

function debugExcelSheets() {
    try {
        const workbook = XLSX.readFile(filePath);
        console.log('Sheet Names:', workbook.SheetNames);
        
        const results = {};
        workbook.SheetNames.forEach(name => {
            const worksheet = workbook.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            results[name] = rows.slice(0, 15);
        });
        
        fs.writeFileSync('shopee_all_sheets.json', JSON.stringify(results, null, 2));
        console.log('All sheets debug info saved to shopee_all_sheets.json');
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

debugExcelSheets();
