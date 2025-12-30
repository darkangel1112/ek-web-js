const { cleanText } = require('../utils/textUtils');

const extractMasodvetesData = (fullText) => {
    // 1. Clean the text globally (already done by caller ideally, but we can do it here if needed)
    // In Python version, it cleans each page then joins. 
    // We assume fullText is passed. We might need to clean it.
    const cleanedText = cleanText(fullText);

    // 2. Find start of section
    const sectionIndex = cleanedText.toLowerCase().indexOf("másodvetés/agrotechnika");
    if (sectionIndex === -1) return [];

    const relevantText = cleanedText.substring(sectionIndex);

    // 3. Split by blocks
    // Python: re.split(r'(Blokk:\s*[A-Z0-9]+\s+Tábla:\s*\d+/\d+)', relevant_text_segment)
    // JS: split uses regex capturing groups nicely.
    const splitRegex = /(Blokk:\s*[A-Z0-9]+\s+Tábla:\s*\d+\/\d+)/;
    const parts = relevantText.split(splitRegex);

    // parts[0] is text before first match.
    // parts[1] is first match (header).
    // parts[2] is content after first match.
    // parts[3] is second match ...

    const data = [];

    // Loop through headers and contents
    // i starts at 1, increment by 2
    for (let i = 1; i < parts.length - 1; i += 2) {
        const header = parts[i];
        const content = parts[i + 1];
        const blockText = header.trim() + "\n" + content.trim();

        const entry = parseMasodvetesEntry(blockText);
        if (entry) {
            data.push(entry);
        }
    }

    return data;
};

const extractAfterKeyword = (text, keyword, stopWords = ["Igényelt", "Kijuttatás", "Másodvetés", "Agrotechnika", "Hasznosítás"], colonOptional = false) => {
    const stopPattern = stopWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const keywordEscaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let patternStr;
    if (colonOptional) {
        patternStr = `${keywordEscaped}:?\\s*([^\\n\\r]+?)(?=\\s*(?:${stopPattern})|\\s*$)`;
    } else {
        patternStr = `${keywordEscaped}:\\s*([^\\n\\r]+?)(?=\\s*(?:${stopPattern})|\\s*$)`;
    }

    const regex = new RegExp(patternStr, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : "N/A";
};


const parseMasodvetesEntry = (blockText) => {
    try {
        const lines = blockText.split('\n');
        const headerLine = lines[0];

        // Match header: Blokk: ... Tábla: ...
        const blokkMatch = headerLine.match(/Blokk:\s*([A-Z0-9]+).*?Tábla:\s*(\d+)\/(\d+)/);
        if (!blokkMatch) return null;

        const [_, blokkId, tablaId, muveletPart] = blokkMatch;
        let muveletSzam = `${tablaId}/${muveletPart}`;

        // Alternative logic for sorszam
        const sorszamMatch = blockText.match(/sorszáma:\s*(\d+\/\d+)/);
        if (sorszamMatch) {
            muveletSzam = sorszamMatch[1];
        }

        const teruletMatch = blockText.match(/Igényelt terület \(ha\):\s*([\d,\.]+)/);
        const terulet = teruletMatch ? parseFloat(teruletMatch[1].replace(',', '.')) : 0.0;

        let tipus = "N/A";
        let megnevezes = "N/A";
        let kijuttatottAnyag = "N/A";
        let novenyKod = "N/A";

        if (blockText.includes("Agrotechnika típusa:")) {
            tipus = "Agrotechnika";
            megnevezes = extractAfterKeyword(blockText, "Agrotechnika típusa", ["Igényelt", "Kijuttatás", "Kaszálás tervezett", "Kondicionáló készítmény"]);

            if (blockText.includes("Kondicionáló")) {
                // Extract conditioner name
                let kondName = extractAfterKeyword(blockText, "Kondicionáló készítmény megnevezése", ["Kijuttatás", "Igényelt", "Másodvetés", "Agrotechnika"], true);
                if (kondName !== "N/A") {
                    kijuttatottAnyag = kondName.replace(/\s*(?:WDGT|Egy\s+elem).*/i, '').trim();
                } else {
                    // Fallback
                    const directMatch = blockText.match(/Kondicionáló készítmény megnevezése\s*:?\s*([^\n\r]+)/i);
                    if (directMatch) kijuttatottAnyag = directMatch[1].trim();
                }
            }
        } else if (blockText.includes("Másodvetés típusa:")) {
            tipus = "Másodvetés";
            megnevezes = extractAfterKeyword(blockText, "Másodvetés típusa", ["Hasznosítás", "Igényelt", "Vegyes hasznosítás"]);

            // Extract Plant info
            // Simple: Hasznosítás: ABC12 Növény név
            const hasznMatch = blockText.match(/Hasznosítás:\s*([A-Z0-9]+)\s+([^\n\r]+?)(?=\s*(?:Vegyes|Másodvetés|Igényelt|$))/i);
            if (hasznMatch) {
                novenyKod = hasznMatch[1];
                kijuttatottAnyag = hasznMatch[2].trim(); // Using kijuttatottAnyag field for plant name here as per python logic 'noveny, kod = _extract...'
                // Wait, python logic:
                // kijuttatott_anyag, noveny_kod = _extract_masodvetes_noveny(block_text)
                // return [..., kijuttatott_anyag, noveny_kod, ...]
                // _extract returns (nev, kod)
                // So kijuttatottAnyag = nev
            } else {
                // Vegyes
                // Simplified for JS (regex all)
                const vegyesRegex = /Vegyes hasznosítás [A-Z]:\s*([A-Z0-9]+)\s+([^\n\r]+?)(?=\s*(?:Vegyes hasznosítás|Igényelt|Másodvetés|$))/gi;
                let vMatch;
                const nevek = [];
                const kodok = [];
                while ((vMatch = vegyesRegex.exec(blockText)) !== null) {
                    kodok.push(vMatch[1].trim());
                    const cleanNev = vMatch[2].replace(/\s*(?:Igényelt|Másodvetés|tervezett).*/, '').trim();
                    if (cleanNev) nevek.push(cleanNev);
                }
                if (nevek.length > 0) {
                    kijuttatottAnyag = nevek.join(", ");
                    novenyKod = kodok.join(", ");
                }
            }
        }

        return {
            blokk: blokkId,
            tabla: parseInt(tablaId) || 0,
            sorszam: muveletSzam,
            tipus: tipus,
            megnevezes: megnevezes,
            anyag: kijuttatottAnyag,
            novenyKod: novenyKod,
            terulet: terulet
        };

    } catch (e) {
        console.error("Masodvetes parse error:", e);
        return null;
    }
}

module.exports = { extractMasodvetesData };
