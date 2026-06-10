import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const filePath = 'c:\\Users\\Bigas\\NuvemShop - MCP - ANTIGRAVITY\\ai-manager\\Shopee_mass_upload_2026-04-07_basic_template.xlsx';

function analyzeExcel() {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with raw headers
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log("Analyzing Shopee Template Rows:");
        rows.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i}:`, row.slice(0, 5).join(' | '), '...');
        });

        // Shopee basic template usually has headers on Row 3 (index 3)
        // Row 0: "Geral"
        // Row 1: Instructions
        // Row 2: Instructions
        // Row 3: Column Names (Category, Product Name, SKU, etc.)
        
        const headers = rows[3];
        if (headers) {
            fs.writeFileSync('shopee_headers.txt', headers.join('\n'));
            console.log("Headers written to shopee_headers.txt");
        } else {
            console.log("Headers row not found at index 3. Checking all rows...");
            rows.forEach((r, i) => {
                if (r && r.length > 5) {
                    console.log(`Row ${i} looks like a header:`, r.slice(0, 3));
                }
            });
        }

    } catch (error) {
        console.error('Erro ao ler a planilha:', error.message);
    }
}

analyzeExcel();
