const { cleanText } = require('../utils/textUtils');

/**
 * Extracts "Fővetés" (Main Plot) data from the PDF text.
 * @param {string} fullText 
 * @returns {Array} List of plot objects
 */
const extractFovetesData = (fullText) => {
    // 1. Extract block details from map pages (approximate logic)
    const blockDetails = extractBlockDetails(fullText);

    // 2. Extract main table data
    const plots = extractMainTableData(fullText);

    // 3. Merge details
    return plots.map(plot => {
        const details = blockDetails[plot.blokk] || { varmegye: "N/A", telepules: "N/A", nitrat: "Nem" };
        return {
            ...plot,
            varmegye: details.varmegye,
            telepules: details.telepules,
            nitrat: details.nitrat
        };
    });
};

const extractBlockDetails = (text) => {
    const details = {};
    // Regexes adapted from Python
    const blockRegex = /Blokkazonosító:\s*([A-Z0-9]+)/g;
    const nitratRegex = /Nitrátérzékeny terület:\s*(Igen|Nem)/;
    const varmegyeRegex = /Vármegye:\s*([^\n]+)/;
    const telepulesRegex = /Település:\s*([^\n]+)/;

    // We need to iterate over "map" sections. 
    // In naive text extraction, we just search for patterns. 
    // Since we don't have page iteration easily in text dump, we scan for block patterns.
    // This part is tricky without per-page isolation. 
    // We will attempt to find contexts. 
    // Assumption: "A kiemelt fizikai blokk adatai:" precedes these details in proximity.

    // Splitting by known headers might help if the text is ordered.
    const sections = text.split("A kiemelt fizikai blokk adatai:");

    // Skip the first part (before the first match)
    for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const blockMatch = section.match(/Blokkazonosító:\s*([A-Z0-9]+)/);
        if (blockMatch) {
            const blockId = blockMatch[1].trim();
            if (!details[blockId]) {
                const nitratMatch = section.match(nitratRegex);
                const varmegyeMatch = section.match(varmegyeRegex);
                const telepulesMatch = section.match(telepulesRegex);

                let varmegye = "N/A";
                let telepules = "N/A";

                if (varmegyeMatch) {
                    varmegye = varmegyeMatch[1].split("Blokkazonosító:")[0].trim();
                }
                if (telepulesMatch) {
                    telepules = telepulesMatch[1].split("Összterület:")[0].trim();
                }

                details[blockId] = {
                    nitrat: nitratMatch ? nitratMatch[1].trim() : "N/A",
                    varmegye: varmegye,
                    telepules: telepules
                };
            }
        }
    }
    return details;
};

const extractMainTableData = (text) => {
    const plots = [];

    // Regex to find plot blocks
    // Python: r"Blokk:\s*(.*?)\s+Tábla:\s*(.*?)\s*(?:Állapot:\s*(.*?))?\n(.*?)(?=(?:Blokk: |8 — Másodvetés/Agrotechnika|—{3,}))"
    // JS conversion:
    // We use a global regex with exec to iterate.
    // Note: JS dot (.) does not match newlines by default, unlike Python's DOTALL.
    // We use [\s\S] instead of . to match everything including newlines.

    const blockRegex = /Blokk:\s*(.*?)\s+Tábla:\s*(.*?)\s*(?:Állapot:\s*(.*?))?\n([\s\S]*?)(?=(?:Blokk:\s|8 — Másodvetés\/Agrotechnika|—{3,}))/g;

    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        const [_, blockId, tableId, status, content] = match;

        if (status && status.toLowerCase().includes("visszavont")) {
            continue;
        }

        // Extract mandatory fields
        const fonovenyMatch = content.match(/Főnövény hasznosítási kód:\s*([A-Z0-9]+)\s*(.*?)\n/);
        const teruletMatch = content.match(/Tábla igényelt terület \(ha\):\s*([\d,.]+)/);

        if (!fonovenyMatch || !teruletMatch) {
            continue;
        }

        const plot = {
            blokk: blockId.trim(),
            tabla: parseInt(tableId.trim()) || 0,
            kod: fonovenyMatch[1].trim(),
            nev: fonovenyMatch[2].trim().split("Kockázatkezelés")[0].trim(),
            meret: parseFloat(teruletMatch[1].trim().replace(',', '.')) || 0.0,
            oko: "N/A",
            szap_anyag: "N/A",
            telepites: "N/A",
            termore_ford: "N/A"
        };

        // Check optional fields
        const okoMatch = content.match(/Ökológiai gazdálkodás:\s*([A-Za-zÁ-ú]+)/);
        if (okoMatch) plot.oko = okoMatch[1].trim();

        const szapMatch = content.match(/Szaporítóanyag célra:\s*([A-Za-zÁ-ú]+)/);
        if (szapMatch) plot.szap_anyag = szapMatch[1].trim();

        const telepitesMatch = content.match(/Főnövény vetési\/telepítési időpontja:\s*([\d\.]+)/);
        if (telepitesMatch) plot.telepites = telepitesMatch[1].trim();

        const termoreMatch = content.match(/Ültetvény termőre fordulásának éve:\s*(\d{4})/);
        if (termoreMatch) plot.termore_ford = termoreMatch[1].trim();

        plots.push(plot);
    }

    // Deduplicate: Python uses drop_duplicates(subset=["Blokk", "Tábla"]).
    // We use a Map keyed by valid block+table.
    const uniquePlots = new Map();
    plots.forEach(p => {
        const key = `${p.blokk}-${p.tabla}`;
        if (!uniquePlots.has(key)) {
            uniquePlots.set(key, p);
        }
    });

    return Array.from(uniquePlots.values());
};

module.exports = { extractFovetesData };
