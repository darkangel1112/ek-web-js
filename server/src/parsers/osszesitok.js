const { cleanText } = require('../utils/textUtils');

const extractSummaryData = (fullText) => {
    // Note: Python splits by pages. PDF-parse gives one big string.
    // The regexes need to assume full text relative positions or be robust.

    // Regexes from Python, adapted for JS (without DOTALL, using [\s\S])
    const jogcimRegex = /Támogatási jogcímek és AKG célprogramok szerint\s*\n([\s\S]*?)(?=Területek összesítése hasznosítási adatok szerint)/i;
    const hasznositasRegex = /Hasznosítási adatok szerint.*?\(főnövény, másodvetés, agrotechnika\)\s*\n([\s\S]*?)(?=Területek összesítése blokkhasználat szerint)/i;
    const blokkRegex = /Területek összesítése blokkhasználat szerint\s*\n([\s\S]*?)(?=\n\d+\s*—|\n[A-Z\s]+ nyilatkozat|\Z)/i; // \Z matches end of string in JS with $ but inside [\s\S]... actually $ works.

    const jogcimMatch = fullText.match(jogcimRegex);
    const hasznositasMatch = fullText.match(hasznositasRegex);
    const blokkMatch = fullText.match(blokkRegex);

    const jogcimData = jogcimMatch ? parseJogcimTable(jogcimMatch[1]) : [];
    const { data: hasznositasData, total: hasznositasTotal } = hasznositasMatch ? parseHasznositasTable(hasznositasMatch[1]) : { data: [], total: 0.0 };
    const { data: blokkData, total: blokkTotal } = blokkMatch ? parseBlokkTable(blokkMatch[1]) : { data: [], total: 0.0 };

    return {
        jogcim: jogcimData,
        hasznositas: hasznositasData,
        hasznositas_total: hasznositasTotal,
        blokkok: blokkData,
        blokkok_total: blokkTotal
    };
};

const parseJogcimTable = (textBlock) => {
    const data = [];
    let lines = textBlock.trim().split('\n');

    // Skip header
    if (lines.length > 0 && (lines[0].includes("Támogatási jogcímek") || lines[0].includes("Igényelt terület"))) {
        lines = lines.slice(1);
    }

    for (const line of lines) {
        // Pattern: something then spaces then number
        const match = line.trim().match(/^(.*?)\s+([\d,.]+)$/);
        if (match) {
            const nev = match[1].trim();
            const teruletStr = match[2];
            try {
                const terulet = parseFloat(teruletStr.replace(',', '.'));
                data.push({
                    nev: nev,
                    terulet: terulet
                });
            } catch (e) { }
        }
    }
    return data;
};

const parseHasznositasTable = (textBlock) => {
    const data = [];
    let total = 0.0;
    let lines = textBlock.trim().split('\n');

    if (lines.length > 0 && (lines[0].includes("Hasznosítás kód") || lines[0].includes("Igényelt terület"))) {
        lines = lines.slice(1);
    }

    // Pattern: 3 letters, 2 digits, space, name, number
    const pattern = /^([A-Z]{3}\d{2})\s+(.+?)\s+([\d,.]+)$/;

    for (const line of lines) {
        const match = line.trim().match(pattern);
        if (match) {
            const kod = match[1];
            const megnevezes = match[2].trim();
            const teruletStr = match[3];
            try {
                const terulet = parseFloat(teruletStr.replace(',', '.'));
                total += terulet;
                data.push({
                    kod: kod,
                    megnevezes: megnevezes,
                    terulet: terulet
                });
            } catch (e) { }
        }
    }
    return { data, total };
};

const parseBlokkTable = (textBlock) => {
    const data = [];
    let total = 0.0;
    let lines = textBlock.trim().split('\n');

    if (lines.length > 0 && (lines[0].includes("Blokk") || lines[0].includes("Igényelt terület"))) {
        lines = lines.slice(1);
    }

    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 2) {
            const [blokkId, teruletStr] = parts;
            // Strict check
            const hasLetter = /[a-zA-Z]/.test(blokkId);
            const hasDigit = /\d/.test(blokkId);

            if (blokkId.length === 8 && hasLetter && hasDigit) {
                try {
                    const terulet = parseFloat(teruletStr.replace(',', '.'));
                    total += terulet;
                    data.push({
                        blokk: blokkId,
                        terulet: terulet
                    });
                } catch (e) { }
            }
        }
    }
    return { data, total };
};

module.exports = { extractSummaryData };
