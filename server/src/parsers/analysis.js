const extractApplicantData = (fullText) => {
    const applicantInfo = { name: 'N/A', mak_id: 'N/A' };

    // Regexes adapted
    const nameRegex = /(?:Kedvezményezett neve|4\s*-*\s*Kedvezményezett adatai\s*Név):\s*([^\n\r]+)/i;
    // Note: ID regex in python has two alternatives.
    const idRegex = /A kérelmező támogatási azonosítója:\s*(\d{10})|Támogatási azonosító:\s*(\d{10})/;

    const nameMatch = fullText.match(nameRegex);
    if (nameMatch) {
        applicantInfo.name = nameMatch[1].trim();
    }

    const idMatch = fullText.match(idRegex);
    if (idMatch) {
        // match[1] or match[2]
        applicantInfo.mak_id = (idMatch[1] || idMatch[2]).trim();
    }

    return applicantInfo;
};

const extractSupportRequests = (fullText) => {
    // Looks for 'q4' which represents a checkbox in some PDF encodings
    const checkedItems = [];

    // Pattern: q4 followed by text
    const pattern = /q4\s+([^\n\rq]+)/g;

    let match;
    while ((match = pattern.exec(fullText)) !== null) {
        let cleanLine = match[1].trim().replace(/\s+/g, ' ');
        if (cleanLine.length > 3) {
            checkedItems.push(cleanLine);
        }
    }

    // Fallback: line by line
    if (checkedItems.length === 0) {
        const lines = fullText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('q4')) {
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.length > 3 && !nextLine.startsWith('q')) {
                        checkedItems.push(nextLine);
                    }
                }
            }
        }
    }

    return checkedItems;
};

const createAnalysisReport = (processedData, fullText) => {
    const applicantInfo = extractApplicantData(fullText);
    const supportRequests = extractSupportRequests(fullText);

    const fovetes = processedData["Fővetés"] || [];
    const masodvetes = processedData["Másodvetés"] || [];
    const hasznositas = processedData["Hasznosítás"] || [];

    // Aggregations
    // 1. Fovetes Sum by Name
    const fovetesSumMap = {};
    fovetes.forEach(p => {
        const name = p.nev;
        fovetesSumMap[name] = (fovetesSumMap[name] || 0) + p.meret;
    });

    // 2. Masodvetes Sum by Material (Anyag) where type is 'Másodvetés'
    const masodvetesSumMap = {};
    masodvetes.forEach(m => {
        if (m.tipus === 'Másodvetés') {
            const name = m.anyag;
            masodvetesSumMap[name] = (masodvetesSumMap[name] || 0) + m.terulet;
        }
    });

    // 3. Hasznositas Map (Original Area)
    const hasznositasMap = {};
    hasznositas.forEach(h => {
        hasznositasMap[h.megnevezes] = h.terulet;
    });

    // Merge keys
    const allNames = new Set([
        ...Object.keys(fovetesSumMap),
        ...Object.keys(masodvetesSumMap),
        ...Object.keys(hasznositasMap)
    ]);

    const reportRows = [];
    let totalEredeti = 0;
    let totalFovetes = 0;
    let totalMasodvetes = 0;
    let totalOsszesen = 0;

    allNames.forEach(name => {
        const eredeti = hasznositasMap[name] || 0;
        const calcFovetes = fovetesSumMap[name] || 0;
        const calcMasodvetes = masodvetesSumMap[name] || 0;
        const calcTotal = calcFovetes + calcMasodvetes;

        // Find code from hasznositas list if available
        const hItem = hasznositas.find(h => h.megnevezes === name);
        const code = hItem ? hItem.kod : "N/A";

        totalEredeti += eredeti;
        totalFovetes += calcFovetes;
        totalMasodvetes += calcMasodvetes;
        totalOsszesen += calcTotal;

        reportRows.push({
            kod: code,
            megnevezes: name,
            teruletEredeti: eredeti,
            fovetesSzamitott: calcFovetes,
            masodvetesSzamitott: calcMasodvetes,
            osszesenSzamitott: calcTotal
        });
    });

    // Sort or keep random order? Python code sorts by unique but pandas merge preserves order somewhat.
    // We'll sort by name for consistency.
    reportRows.sort((a, b) => a.megnevezes.localeCompare(b.megnevezes));

    // Stats
    const nitrateSum = fovetes.filter(p => p.nitrat && p.nitrat.toLowerCase() === 'igen')
        .reduce((acc, p) => acc + p.meret, 0);

    const top5Sum = [...fovetes].sort((a, b) => b.meret - a.meret)
        .slice(0, 5)
        .reduce((acc, p) => acc + p.meret, 0);

    const agrotechnics = [...new Set(masodvetes.filter(m => m.tipus === 'Agrotechnika').map(m => m.megnevezes))];

    return {
        applicant_info: applicantInfo,
        summary_df: reportRows,
        totals: {
            teruletEredeti: totalEredeti,
            fovetesSzamitott: totalFovetes,
            masodvetesSzamitott: totalMasodvetes,
            osszesenSzamitott: totalOsszesen
        },
        extra_stats: {
            nitrate_sum: nitrateSum,
            top_5_plots_sum: top5Sum,
            agrotechnics: agrotechnics.length > 0 ? agrotechnics : ["Nincs agrotechnikai művelet."],
            support_requests: supportRequests.length > 0 ? supportRequests : ["Nincs támogatási igény kiválasztva."]
        }
    };
};

module.exports = { createAnalysisReport };
