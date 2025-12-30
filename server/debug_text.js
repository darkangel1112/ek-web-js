const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const debugText = async () => {
    try {
        const filePath = path.join(__dirname, '../SL_EK25.pdf');
        const dataBuffer = fs.readFileSync(filePath);
        const parser = new PDFParse({ data: dataBuffer });

        const data = await parser.getText();
        const fullText = data.text;

        const startIdx = fullText.indexOf("Támogatási/kifizetési igények");
        const area = fullText.substring(startIdx, startIdx + 5000);

        console.log("--- CLEANED SECTION ---");
        // Replace multiple whitespace with single space
        console.log(area.replace(/\s+/g, ' '));
        console.log("--- END ---");

        await parser.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
};

debugText();
