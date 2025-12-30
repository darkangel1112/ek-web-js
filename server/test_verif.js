const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const testExtraction = async () => {
    try {
        const filePath = path.join(__dirname, '../SL_EK25.pdf');

        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }

        console.log(`Uploading ${filePath}...`);

        const form = new FormData();
        form.append('files', fs.createReadStream(filePath));

        const response = await axios.post('http://localhost:3000/api/upload', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const data = response.data;
        const filename = 'SL_EK25.pdf';

        if (data[filename] && data[filename].success) {
            console.log("✅ Extraction Successful!");
            const analysis = data[filename].analysis_data;
            console.log("\n--- Támogatási igények (Checked Only) ---");
            if (analysis.extra_stats.support_requests.length > 0) {
                analysis.extra_stats.support_requests.forEach(r => console.log(`- ${r}`));
            } else {
                console.log("Nincs támogatási igény találva.");
            }
        } else {
            console.error("❌ Extraction Failed");
            console.error(data);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

testExtraction();
