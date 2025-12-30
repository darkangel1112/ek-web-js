const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generatePDF = (processedData, res) => {
    // If res is provided, we pipe to it. 
    // If we want to return a buffer (for ZIP), we might need a different approach.
    // We'll support both via a wrapper or assume res is a stream (which could be a PassThrough).

    const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true });

    const buffers = [];
    if (res) {
        doc.pipe(res);
    } else {
        doc.on('data', buffers.push.bind(buffers));
    }

    // Font setup
    const fontPath = path.join(__dirname, '../../../assets/Roboto-Regular.ttf');
    let fontName = 'Helvetica'; // Fallback
    if (fs.existsSync(fontPath)) {
        doc.registerFont('Roboto', fontPath);
        fontName = 'Roboto';
    }

    const { fovetes, masodvetes, summary_dict, analysis_data } = processedData;

    // 1. Cover Page
    addCoverPage(doc, analysis_data.applicant_info, fontName);

    // 2. Summary Table
    if (analysis_data.summary_df && analysis_data.summary_df.length > 0) {
        addTablePage(doc, "Összesítő Táblázat",
            ['Kód', 'Megnevezés', 'Eredeti (ha)', 'Fővetés (ha)', 'Másodvetés (ha)', 'Összesen (ha)'],
            analysis_data.summary_df.map(r => [
                r.kod, r.megnevezes,
                fmt(r.teruletEredeti), fmt(r.fovetesSzamitott),
                fmt(r.masodvetesSzamitott), fmt(r.osszesenSzamitott)
            ]),
            fontName, true // Landscape
        );
        // Add totals row manually if needed or included in data
        // Our analysis_data.summary_df doesn't strictly have the total row object, logic separates it.
        // We'll skip for brevity or add it.
    }

    // 3. Fővetés
    if (fovetes && fovetes.length > 0) {
        addTablePage(doc, "Fővetés Adatok",
            ['Blokk', 'Tábla', 'Kód', 'Név', 'Méret (ha)', 'Nitrát'],
            fovetes.map(r => [
                r.blokk, r.tabla, r.kod, r.nev, fmt(r.meret), r.nitrat
            ]),
            fontName, true
        );
    }

    // 4. Másodvetés
    if (masodvetes && masodvetes.length > 0) {
        addTablePage(doc, "Másodvetés/Agrotechnikai Adatok",
            ['Blokk', 'Tábla', 'Sorszám', 'Típus', 'Megnevezés', 'Anyag', 'Növény', 'Terület'],
            masodvetes.map(r => [
                r.blokk, r.tabla, r.sorszam, r.tipus, r.megnevezes, r.anyag, r.novenyKod, fmt(r.terulet)
            ]),
            fontName, true
        );
    }

    // 5. Jogcímek
    if (summary_dict.jogcim && summary_dict.jogcim.length > 0) {
        addTablePage(doc, "Támogatási Jogcímek",
            ['Jogcím', 'Terület (ha)'],
            summary_dict.jogcim.map(r => [r.nev, fmt(r.terulet)]),
            fontName, false
        );
    }

    // 6. Hasznosítás
    if (summary_dict.hasznositas && summary_dict.hasznositas.length > 0) {
        addTablePage(doc, "Hasznosítási Adatok",
            ['Kód', 'Megnevezés', 'Terület (ha)'],
            summary_dict.hasznositas.map(r => [r.kod, r.megnevezes, fmt(r.terulet)]),
            fontName, false
        );
    }

    // 7. Blokkok
    if (summary_dict.blokkok && summary_dict.blokkok.length > 0) {
        addTablePage(doc, "Blokkhasználat",
            ['Blokk', 'Terület (ha)'],
            summary_dict.blokkok.map(r => [r.blokk, fmt(r.terulet)]),
            fontName, false
        );
    }

    // 8. Statistics
    addStatisticsPage(doc, analysis_data.extra_stats, fovetes.length, fontName);

    doc.end();

    if (!res) {
        return new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });
    }

    return doc;
};

const fmt = (num) => {
    if (typeof num !== 'number') return num;
    return num.toFixed(4);
};

const addCoverPage = (doc, applicantInfo, fontName) => {
    doc.addPage();

    // Logo if exists
    const logoPath = path.join(__dirname, '../../../assets/logo.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 250, 50, { width: 100 });
        doc.moveDown(5);
    } else {
        doc.moveDown(5);
    }

    doc.font(fontName).fontSize(20).fillColor('#2E7D32').text('Egységes Kérelem Elemzés', { align: 'center' });
    doc.fillColor('black').moveDown();

    doc.fontSize(12).text(`Név: ${applicantInfo.name}`, { align: 'left', indent: 50 });
    doc.moveDown(0.5);
    doc.text(`Azonosító: ${applicantInfo.mak_id}`, { align: 'left', indent: 50 });
    doc.moveDown(2);

    doc.fontSize(10).text(`Generálva: ${new Date().toLocaleString()}`, { align: 'center' });
};

const addTablePage = (doc, title, headers, rows, fontName, landscape) => {
    doc.addPage({ layout: landscape ? 'landscape' : 'portrait', margin: 30 });
    doc.font(fontName).fontSize(14).text(title, { underline: true });
    doc.moveDown();

    const pageWidth = landscape ? 841.89 : 595.28;
    const margin = 30;
    const usableWidth = pageWidth - (margin * 2);
    const colWidth = usableWidth / headers.length;

    // Header
    doc.fontSize(8).font(fontName);
    let y = doc.y;

    // Draw Header
    doc.save();
    doc.rect(margin, y, usableWidth, 15).fill('#DDEBF7');
    doc.fillColor('black');
    headers.forEach((h, i) => {
        doc.text(h, margin + (i * colWidth) + 2, y + 4, { width: colWidth - 4, align: 'left' });
    });
    doc.restore();

    y += 15;

    // Rows
    rows.forEach((row, rowIndex) => {
        if (y > doc.page.height - 50) {
            doc.addPage({ layout: landscape ? 'landscape' : 'portrait', margin: 30 });
            y = 30;
            // Redraw Header
            doc.save();
            doc.rect(margin, y, usableWidth, 15).fill('#DDEBF7');
            doc.fillColor('black');
            headers.forEach((h, i) => {
                doc.text(h, margin + (i * colWidth) + 2, y + 4, { width: colWidth - 4, align: 'left' });
            });
            doc.restore();
            y += 15;
        }

        row.forEach((cell, i) => {
            let str = String(cell || '');
            if (str.length > 30) str = str.substring(0, 27) + '...';
            doc.text(str, margin + (i * colWidth) + 2, y + 2, { width: colWidth - 4 });
        });

        // Draw grid lines
        doc.rect(margin, y, usableWidth, 12).stroke();
        headers.forEach((_, i) => {
            doc.rect(margin + (i * colWidth), y, colWidth, 12).stroke();
        });

        y += 12;
    });
};

const addStatisticsPage = (doc, stats, tableCount, fontName) => {
    doc.addPage();
    doc.font(fontName).fontSize(14).text('Kiegészítő Statisztikák', { underline: true });
    doc.moveDown();

    doc.fontSize(11).text(`Táblák száma: ${tableCount}`);
    doc.moveDown(0.5);
    doc.text(`Nitrátérzékeny terület: ${fmt(stats.nitrate_sum)} ha`);
    doc.moveDown(0.5);
    doc.text(`Top 5 tábla: ${fmt(stats.top_5_plots_sum)} ha`);
    doc.moveDown(1);

    doc.font(fontName).fontSize(11).text('Agrotechnikai műveletek:', { underline: true });
    doc.fontSize(10);
    (stats.agrotechnics || []).forEach(t => doc.text(`- ${t}`));

    doc.moveDown(1);
    doc.font(fontName).fontSize(11).text('Támogatási igények:', { underline: true });
    doc.fontSize(10);
    (stats.support_requests || []).forEach(r => doc.text(`+ ${r}`));
};


module.exports = { generatePDF };
