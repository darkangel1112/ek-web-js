const ExcelJS = require('exceljs');

const generateExcel = async (processedData, res) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mezogazdasagi Adatkinyero';
    workbook.created = new Date();

    // Loop through each file's data? 
    // The previous implementation handles single or multiple.
    // Here we usually export one file or a zip of multiple. 
    // "generate_zip_export" in python calls "export_to_excel" for each file.
    // If we call this for a single file data object:

    // We assume processedData is for ONE file here. 
    // If we want multiple files in one workbook (COMBINE mode), we'd need loop.
    // For now, let's assume Single File Export.

    const { fovetes, masodvetes, summary_dict, analysis_data } = processedData;

    // 1. Adatfeldolgozás Sheet (Summary Report)
    const summarySheet = workbook.addWorksheet('Adatfeldolgozás');
    await writeAnalysisReport(summarySheet, analysis_data);

    // 2. Fővetés Sheet
    const fovetesSheet = workbook.addWorksheet('Fővetés');
    if (fovetes && fovetes.length > 0) {
        // Define columns
        fovetesSheet.columns = [
            { header: 'Vármegye', key: 'varmegye', width: 15 },
            { header: 'Település', key: 'telepules', width: 15 },
            { header: 'Blokk', key: 'blokk', width: 10 },
            { header: 'Tábla', key: 'tabla', width: 8 },
            { header: 'Kód', key: 'kod', width: 8 },
            { header: 'Név', key: 'nev', width: 30 },
            { header: 'Méret (ha)', key: 'meret', width: 12 },
            { header: 'ÖKO', key: 'oko', width: 10 },
            { header: 'Szap.anyag', key: 'szap_anyag', width: 10 },
            { header: 'Telepítés', key: 'telepites', width: 10 },
            { header: 'Termőre ford.', key: 'termore_ford', width: 10 },
            { header: 'Nitrát', key: 'nitrat', width: 8 }
        ];

        fovetes.forEach(row => fovetesSheet.addRow(row));

        // Format numbers
        fovetesSheet.getColumn('meret').numFmt = '0.0000';
    }

    // 3. Másodvetés Sheet
    const masodvetesSheet = workbook.addWorksheet('Másodvetés');
    masodvetesSheet.columns = [
        { header: 'Blokk', key: 'blokk', width: 10 },
        { header: 'Tábla', key: 'tabla', width: 8 },
        { header: 'Sorszám', key: 'sorszam', width: 10 },
        { header: 'Típus', key: 'tipus', width: 15 },
        { header: 'Megnevezés', key: 'megnevezes', width: 30 },
        { header: 'Anyag', key: 'anyag', width: 20 },
        { header: 'Növény kód', key: 'novenyKod', width: 10 },
        { header: 'Terület (ha)', key: 'terulet', width: 12 }
    ];
    if (masodvetes) masodvetes.forEach(row => masodvetesSheet.addRow(row));
    masodvetesSheet.getColumn('terulet').numFmt = '0.0000';

    // 4. Jogcímek Sheet
    const jogcimSheet = workbook.addWorksheet('Jogcímek');
    jogcimSheet.columns = [
        { header: 'Támogatási jogcím', key: 'nev', width: 40 },
        { header: 'Terület (ha)', key: 'terulet', width: 15 }
    ];
    if (summary_dict.jogcim) summary_dict.jogcim.forEach(row => jogcimSheet.addRow(row));
    jogcimSheet.getColumn('terulet').numFmt = '0.0000';

    // 5. Hasznosítás Sheet
    const hasznositasSheet = workbook.addWorksheet('Hasznosítás');
    hasznositasSheet.columns = [
        { header: 'Kód', key: 'kod', width: 10 },
        { header: 'Megnevezés', key: 'megnevezes', width: 40 },
        { header: 'Terület (ha)', key: 'terulet', width: 15 }
    ];
    if (summary_dict.hasznositas) summary_dict.hasznositas.forEach(row => hasznositasSheet.addRow(row));
    // Total row
    hasznositasSheet.addRow({ kod: '', megnevezes: 'Összesen:', terulet: analysis_data.totals?.hasznositas_total || 0 });
    hasznositasSheet.getRow(hasznositasSheet.rowCount).font = { bold: true };
    hasznositasSheet.getColumn('terulet').numFmt = '0.0000';

    // 6. Blokkok Sheet
    const blokkokSheet = workbook.addWorksheet('Blokkok');
    blokkokSheet.columns = [
        { header: 'Blokk azonosító', key: 'blokk', width: 15 },
        { header: 'Terület (ha)', key: 'terulet', width: 15 }
    ];
    if (summary_dict.blokkok) summary_dict.blokkok.forEach(row => blokkokSheet.addRow(row));
    blokkokSheet.addRow({ blokk: 'Összesen:', terulet: analysis_data.totals?.blokkok_total || 0 });
    blokkokSheet.getRow(blokkokSheet.rowCount).font = { bold: true };
    blokkokSheet.getColumn('terulet').numFmt = '0.0000';

    // Write to response or return buffer
    if (res) {
        await workbook.xlsx.write(res);
    } else {
        return await workbook.xlsx.writeBuffer();
    }
};

const writeAnalysisReport = async (sheet, analysisData) => {
    // Styling
    const bold = { bold: true };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DDEBF7' } };
    const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };

    let rowIdx = 1;

    // Header Info
    sheet.getCell(`A${rowIdx}`).value = "Gazda megnevezése:";
    sheet.getCell(`A${rowIdx}`).font = bold;
    sheet.getCell(`B${rowIdx}`).value = analysisData.applicant_info.name;
    rowIdx++;
    sheet.getCell(`A${rowIdx}`).value = "MÁK Azonosító:";
    sheet.getCell(`A${rowIdx}`).font = bold;
    sheet.getCell(`B${rowIdx}`).value = analysisData.applicant_info.mak_id;
    rowIdx += 2;

    // Summary Table
    // Columns: Kód, Megnevezés, Terület (Eredeti), Fővetés (Számított), Másodvetés (Számított), Összesen (Számított)
    const headers = ['Kód', 'Megnevezés', 'Terület (Eredeti)', 'Fővetés (Számított)', 'Másodvetés (Számított)', 'Összesen (Számított)'];
    headers.forEach((h, i) => {
        const cell = sheet.getCell(rowIdx, i + 1);
        cell.value = h;
        cell.font = bold;
        cell.fill = headerFill;
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    rowIdx++;

    analysisData.summary_df.forEach(row => {
        const values = [
            row.kod,
            row.megnevezes,
            row.teruletEredeti,
            row.fovetesSzamitott,
            row.masodvetesSzamitott,
            row.osszesenSzamitott
        ];
        values.forEach((v, i) => {
            const cell = sheet.getCell(rowIdx, i + 1);
            cell.value = v;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (i >= 2) cell.numFmt = '0.0000';
        });
        rowIdx++;
    });

    // Totals row for summary table
    const totals = analysisData.totals;
    if (totals) {
        const totalValues = [
            "", "Összesen:",
            totals.teruletEredeti,
            totals.fovetesSzamitott,
            totals.masodvetesSzamitott,
            totals.osszesenSzamitott
        ];
        totalValues.forEach((v, i) => {
            const cell = sheet.getCell(rowIdx, i + 1);
            cell.value = v;
            cell.font = bold;
            cell.fill = totalFill;
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (i >= 2) cell.numFmt = '0.0000';
        });
        rowIdx++;
    }

    rowIdx++; // Spacer

    // Extra Stats
    // Nitrate
    sheet.getCell(`A${rowIdx}`).value = "Nitrátérzékeny terület (összesen):";
    sheet.getCell(`A${rowIdx}`).font = bold;
    sheet.getCell(`B${rowIdx}`).value = analysisData.extra_stats.nitrate_sum;
    sheet.getCell(`B${rowIdx}`).numFmt = '0.0000';
    rowIdx++;

    // Top 5
    sheet.getCell(`A${rowIdx}`).value = "5 legnagyobb tábla területe (összesen):";
    sheet.getCell(`A${rowIdx}`).font = bold;
    sheet.getCell(`B${rowIdx}`).value = analysisData.extra_stats.top_5_plots_sum;
    sheet.getCell(`B${rowIdx}`).numFmt = '0.0000';
    rowIdx++;

    // Table count
    sheet.getCell(`A${rowIdx}`).value = "Táblák száma (db):";
    sheet.getCell(`A${rowIdx}`).font = bold;
    sheet.getCell(`B${rowIdx}`).value = analysisData.extra_stats.tables_count || 0;
    rowIdx += 2;

    // Agrotechnics
    sheet.getCell(`A${rowIdx}`).value = "Elvégzett agrotechnikai műveletek:";
    sheet.getCell(`A${rowIdx}`).font = bold;
    rowIdx++;
    (analysisData.extra_stats.agrotechnics || []).forEach(tech => {
        sheet.getCell(`A${rowIdx}`).value = tech;
        rowIdx++;
    });
    rowIdx++;

    // Support Requests
    sheet.getCell(`A${rowIdx}`).value = "Kiválasztott Támogatási Igények:";
    sheet.getCell(`A${rowIdx}`).font = bold;
    rowIdx++;
    (analysisData.extra_stats.support_requests || []).forEach(req => {
        sheet.getCell(`A${rowIdx}`).value = req;
        rowIdx++;
    });

    // Column widths
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 20;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 20;
};

module.exports = { generateExcel };
