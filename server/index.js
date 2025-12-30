const express = require('express');
const multer = require('multer');
const cors = require('cors');

const fs = require('fs'); // Though we use memory storage usually
const path = require('path');

const { extractFovetesData } = require('./src/parsers/fovetes');
const { extractMasodvetesData } = require('./src/parsers/masodvetes');
const { extractSummaryData } = require('./src/parsers/osszesitok');
const { createAnalysisReport } = require('./src/parsers/analysis');

// Placeholder for generators (will implement next)
// const { generateExcel } = require('./src/generators/excelGenerator');
// const { generatePDF } = require('./src/generators/pdfGenerator');
// const { generateZip } = require('./src/generators/zipGenerator');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Memory storage for uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/health', (req, res) => {
    res.send({ status: 'ok' });
});

app.post('/api/upload', upload.array('files'), async (req, res) => {
    const results = {};

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send({ error: 'No files uploaded' });
        }

        for (const file of req.files) {
            try {
                const dataBuffer = file.buffer;
                let textContent = "";

                // PDF-Parse v2 Class usage
                const { PDFParse } = require('pdf-parse');
                const parser = new PDFParse({ data: dataBuffer });
                try {
                    const data = await parser.getText();
                    textContent = data.text;
                } finally {
                    await parser.destroy(); // Always destroy to free memory
                }

                const fullText = textContent;

                // Run parsers
                // 1. Fovetes
                const fovetes = extractFovetesData(fullText);

                // 2. Masodvetes
                const masodvetes = extractMasodvetesData(fullText);

                // 3. Summaries
                const summaries = extractSummaryData(fullText);

                const processedData = {
                    "Fővetés": fovetes,
                    "Másodvetés": masodvetes,
                    "Hasznosítás": summaries.hasznositas,
                    "Jogcímek": summaries.jogcim,
                    "Blokkok": summaries.blokkok
                };

                // 4. Analysis
                const analysisData = createAnalysisReport(processedData, fullText);

                // Add table count to extra stats (Python: len(fovetes_df))
                analysisData.extra_stats.tables_count = fovetes.length;

                // Merge summaries totals
                analysisData.totals = {
                    ...analysisData.totals,
                    hasznositas_total: summaries.hasznositas_total,
                    blokkok_total: summaries.blokkok_total
                };

                results[file.originalname] = {
                    success: true,
                    filename: file.originalname,
                    fovetes: fovetes,
                    masodvetes: masodvetes,
                    summary_dict: summaries,
                    analysis_data: analysisData,
                    processed_data: processedData // Redundant but kept for consistency
                };

            } catch (err) {
                console.error(`Error processing file ${file.originalname}:`, err);
                results[file.originalname] = {
                    success: false,
                    filename: file.originalname,
                    error: err.message
                };
            }
        }

        res.json(results);

    } catch (e) {
        console.error("Upload error:", e);
        res.status(500).json({ error: e.message });
    }
});



const { generateExcel } = require('./src/generators/excelGenerator');
const { generatePDF } = require('./src/generators/pdfGenerator');
const archiver = require('archiver');

app.post('/api/export', async (req, res) => {
    try {
        const { type, data, filename } = req.body;

        if (!data) return res.status(400).send("No data provided");

        if (type === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename || 'export.xlsx'}`);
            await generateExcel(data, res);
        } else if (type === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename || 'export.pdf'}`);
            generatePDF(data, res);
        } else if (type === 'zip') {
            // Expect data to be an object/array of files
            // data = { "file1": { ... }, "file2": { ... } }

            const archive = archiver('zip', { zlib: { level: 9 } });
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${filename || 'export.zip'}`);

            archive.pipe(res);

            for (const [key, item] of Object.entries(data)) {
                if (!item.success) continue;

                const safeName = item.analysis_data?.applicant_info?.name?.replace(/ /g, '_') || "export";

                // Excel
                const excelBuffer = await generateExcel(item);
                archive.append(excelBuffer, { name: `${safeName}.xlsx` });

                // PDF
                const pdfBuffer = await generatePDF(item);
                archive.append(pdfBuffer, { name: `${safeName}.pdf` });
            }

            await archive.finalize();
        } else {
            res.status(400).send("Invalid export type");
        }

    } catch (e) {
        console.error("Export error:", e);
        if (!res.headersSent) res.status(500).send(e.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
