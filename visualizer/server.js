const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());

// Caminhos absolutos para o local real dos logs e checkpoints
const SYNC_LOG_FILE = path.join(__dirname, '../sync_progress.log');
const SEO_LOG_FILE = path.join(__dirname, '../seo_progress.log');
const METADATA_CHECKPOINT = path.join(__dirname, '../scripts/checkpoint_metadata.json');
const SEO_CHECKPOINT = path.join(__dirname, '../scripts/checkpoint_seo.json');

const TOTAL_PRODUCTS = 14991;
const TOTAL_PAGES = 300;

app.get('/logs', (req, res) => {
    try {
        const getLogs = (filePath) => {
            if (!fs.existsSync(filePath)) return { lines: [], all: [] };
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            return { lines: lines.slice(-100), all: lines };
        };

        const getPage = (checkpointPath) => {
            console.log(`[DEBUG] Verificando checkpoint: ${checkpointPath}`);
            if (!fs.existsSync(checkpointPath)) {
                console.log(`[DEBUG] Arquivo NÃO encontrado: ${checkpointPath}`);
                return 1;
            }
            try {
                const data = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
                console.log(`[DEBUG] Página lida: ${data.page}`);
                return data.page || 1;
            } catch (e) {
                console.log(`[DEBUG] Erro ao ler JSON: ${e.message}`);
                return 1;
            }
        };

        const syncData = getLogs(SYNC_LOG_FILE);
        const seoData = getLogs(SEO_LOG_FILE);

        const metadataPage = getPage(METADATA_CHECKPOINT);
        const seoPage = getPage(SEO_CHECKPOINT);

        // Cálculo Real: 50 produtos por página, limitado ao total do catálogo
        const syncProcessedCount = Math.min(TOTAL_PRODUCTS, (metadataPage - 1) * 50);
        const seoProcessedCount = Math.min(TOTAL_PRODUCTS, (seoPage - 1) * 50);

        res.json({
            sync: syncData.lines,
            seo: seoData.lines,
            metrics: {
                syncProcessedCount,
                seoProcessedCount,
                metadataPage,
                seoPage,
                metadataPagesLeft: Math.max(0, TOTAL_PAGES - metadataPage),
                seoPagesLeft: Math.max(0, TOTAL_PAGES - seoPage),
                totalPages: TOTAL_PAGES
            },
            totalProducts: TOTAL_PRODUCTS
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Habbo-style Log server running at http://localhost:${port}`);
});
