const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// SESUDAH (Mendukung port otomatis dari cloud, fallback ke 3002 di lokal)
const PORT = process.env.PORT || 3002;

app.use(cors());
// Melayani seluruh file HTML screener di folder ini
app.use(express.static(__dirname));

// 1. ENDPOINT KGI (HD) - FIXED ERROR HANDLING
app.get('/api/kgi', async (req, res) => {
    console.log("\n⏳ Menarik data khusus KGI (HD)...");
    try {
        const response = await fetch("https://warrants.kgi.id/StructuredWarrant/WarrantSearch/Searchs/SearchData", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
                "authorization": "Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NzcxMjEyNS01NzA5LTRkNTAtYWNhMC04MWE2Y2NjZDFiMjIiLCJMb2dpblVzZXJJZCI6IlN0cnVjdHVyZWRXYXJyYW50IiwiTG9naW5Vc2VyTmFtZSI6IkluZG9uZXNpYSIsIkxvZ2luVXNlckVtYWlsIjoiaXQuYXBAa2dpLmNvbSIsIm5iZiI6MTc4OTQzMTY4MCwiZXhwIjoxNzg5NTE4MDgwLCJpYXQiOjE3ODk0MzE2ODAsImlzcyI6Imh0dHBzOi8va2dpLmNvbSIsImF1ZCI6Imh0dHBzOi8va2dpLmNvbSJ9.itx5_wfrqaQQjwUQX3itSPJoXoXtAJ428FAeltZMGjd9Mxl8yrloG0dj_9C0K_UxH7JzpldsMOHEyjeNah6K5g",
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Referer": "https://warrants.kgi.id/id/warrant-search"
            },
            "body": JSON.stringify({
                "Underlying": "All",
                "IssuingBroker": "PT KGI SEKURITAS INDONESIA",
                "Callput": -1,
                "EffectiveGearing1": -1,
                "EffectiveGearing2": -1,
                "ExercisePrice1": "All",
                "ExercisePrice2": "All",
                "TimeMaturity1": -1,
                "TimeMaturity2": -1,
                "Moneyness1": -1,
                "Moneyness2": -1,
                "WarrantPrice1": "0",
                "WarrantPrice2": "50",
                "Page": 1,
                "ItemsPerPage": -1,
                "SortName": "",
                "SortDirection": ""
            }),
            "method": "POST"
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`❌ Penolakan dari KGI: HTTP ${response.status}`);
            return res.status(response.status).json({ 
                error: `KGI menolak koneksi (HTTP ${response.status}). Kemungkinan IP Cloud Vercel diblokir.`,
                detail: errText 
            });
        }

        const rawText = await response.text();
        const jsonData = JSON.parse(rawText);
        
        let dataArray = [];
        if (jsonData && jsonData.Value && Array.isArray(jsonData.Value.Warrants)) {
            dataArray = jsonData.Value.Warrants;
        } else if (jsonData && Array.isArray(jsonData.data)) {
            dataArray = jsonData.data;
        } else if (Array.isArray(jsonData)) {
            dataArray = jsonData;
        }

        return res.json({ stats: { success: ['KGI'], failed: [] }, data: dataArray });
    } catch (error) {
        console.error("❌ Error KGI Serverless:", error.message);
        return res.status(500).json({ error: error.message });
    }
});

// 2. ENDPOINT MAYBANK (ZP)
app.get('/api/maybank', async (req, res) => {
    console.log("\n⏳ Menarik data khusus Maybank (ZP)...");
    try {
        const response = await fetch("https://waran.maybank.com/mibbwebservice/GetScreenerData", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.7",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Brave\";v=\"150\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "x-requested-with": "XMLHttpRequest",
                "cookie": "JSESSIONID=\"1130b2777f17f382ed2147b85e82.Wildfly Console (WEBIDAPI)\"; JSESSIONID=1130b2777f17f382ed2147b85e82",
                "Referer": "https://waran.maybank.com/id/WarrantTools/WarrantSearch"
            },
            "body": "token=webkey&underlying=all&type=all&issuer=MSI&maturity=all&moneyness=all&effectiveGearing=all&expiry=all&sensitivity=all&indicator=all&sortBy=wcode&sortOrder=asc",
            "method": "POST"
        });

        if (!response.ok) throw new Error("Gagal akses Maybank (HTTP " + response.status + ")");

        const rawText = await response.text();
        const jsonData = JSON.parse(rawText);
        const dataArray = Array.isArray(jsonData) ? jsonData : (jsonData.data || []);
        
        res.json({ stats: { success: ['Maybank'], failed: [] }, data: dataArray });
        console.log(`✅ Sukses! ${dataArray.length} waran Maybank berhasil ditarik.`);
    } catch (error) {
        console.error("❌ Error Maybank:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. ENDPOINT RHB (DR)
app.get('/api/rhb', async (req, res) => {
    console.log("\n⏳ Menarik data khusus RHB (DR)...");
    try {
        const response = await fetch("https://waran.rhbtradesmart.co.id/rhbwebservice/GetScreenerData", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.6",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Brave\";v=\"150\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "x-requested-with": "XMLHttpRequest",
                "cookie": "Path=/; Path=/",
                "Referer": "https://waran.rhbtradesmart.co.id/id/WarrantSearch"
            },
            "body": "token=webkey&underlying=all&type=all&issuer=RHB&maturity=all&moneyness=all&effectiveGearing=all&expiry=all&sortBy=wcode&sortOrder=asc",
            "method": "POST"
        });

        if (!response.ok) throw new Error("Gagal akses RHB (HTTP " + response.status + ")");

        const rawText = await response.text();
        const jsonData = JSON.parse(rawText);
        
        let dataArray = [];
        if (jsonData && Array.isArray(jsonData.ric)) {
            dataArray = jsonData.ric;
        } else if (Array.isArray(jsonData)) {
            dataArray = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            if (Array.isArray(jsonData.data)) dataArray = jsonData.data;
            else if (Array.isArray(jsonData.d)) dataArray = jsonData.d;
            else if (Array.isArray(jsonData.List)) dataArray = jsonData.List;
            else {
                const foundArrays = Object.values(jsonData).filter(val => Array.isArray(val));
                if (foundArrays.length > 0) {
                    dataArray = foundArrays.sort((a, b) => b.length - a.length)[0];
                } else {
                    dataArray = [jsonData];
                }
            }
        }

        res.json({ stats: { success: ['RHB'], failed: [] }, data: dataArray });
        console.log(`✅ Sukses! ${dataArray.length} waran RHB berhasil ditarik.`);
    } catch (error) {
        console.error("❌ Error RHB:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 4. ENDPOINT CGSI (YU)
app.get('/api/cgsi', async (req, res) => {
    console.log("\n⏳ Menarik data khusus CGSI (YU)...");
    try {
        const response = await fetch("https://waran.cgsi.co.id/cgsi/api/v1/GetScreenerData?token=webkey&underlying=all&type=all&moneyness=all&maturity=all&effectiveGearing=all&issuer=CGS&expiry=all&indicator=all&sensitivity=all&sortBy=wcode&sortOrder=asc", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.8",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Brave\";v=\"150\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "x-requested-with": "XMLHttpRequest",
                "Referer": "https://waran.cgsi.co.id/WarrantTools/WarrantSearch"
            },
            "body": null,
            "method": "GET"
        });

        if (!response.ok) throw new Error("Gagal akses CGSI (HTTP " + response.status + ")");

        const rawText = await response.text();
        const jsonData = JSON.parse(rawText);
        
        let dataArray = [];
        if (jsonData && Array.isArray(jsonData.data)) {
            dataArray = jsonData.data;
        } else if (jsonData && Array.isArray(jsonData.ric)) {
            dataArray = jsonData.ric;
        } else if (jsonData && jsonData.Value && Array.isArray(jsonData.Value.Warrants)) {
            dataArray = jsonData.Value.Warrants;
        } else if (jsonData && Array.isArray(jsonData.items)) {
            dataArray = jsonData.items;
        } else if (Array.isArray(jsonData)) {
            dataArray = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            const foundArrays = Object.values(jsonData).filter(val => Array.isArray(val));
            if (foundArrays.length > 0) {
                dataArray = foundArrays.sort((a, b) => b.length - a.length)[0];
            } else {
                dataArray = [jsonData];
            }
        }

        res.json({ stats: { success: ['CGSI'], failed: [] }, data: dataArray });
        console.log(`✅ Sukses! ${dataArray.length} waran CGSI berhasil ditarik.`);
    } catch (error) {
        console.error("❌ Error CGSI:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 5. ENDPOINT KISI (BQ) - UPDATED
app.get('/api/kisi', async (req, res) => {
    console.log("\n⏳ Menarik data khusus KISI Sekuritas (BQ)...");
    try {
        const response = await fetch("https://api-compro.kisi.co.id/api/v2/swari/product/1", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.7",
    "if-none-match": "W/\"1fc11-sQZJH9+mk+tK7R2TFsmhiV+MgAM\"",
    "priority": "u=1, i",
    "Referer": "https://www.kisi.co.id/"
  },
  "body": null,
  "method": "GET"
});

        if (!response.ok) throw new Error("Gagal akses KISI (HTTP " + response.status + ")");

        const rawText = await response.text();
        let jsonData;
        try {
            jsonData = JSON.parse(rawText);
        } catch (parseErr) {
            throw new Error("Respon dari KISI bukan JSON valid (kemungkinan terblokir WAF/Cloudflare)");
        }

        let dataArray = [];
        if (Array.isArray(jsonData)) {
            dataArray = jsonData;
        } else if (jsonData && Array.isArray(jsonData.data)) {
            dataArray = jsonData.data;
        } else if (jsonData && Array.isArray(jsonData.items)) {
            dataArray = jsonData.items;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            const foundArrays = Object.values(jsonData).filter(val => Array.isArray(val));
            if (foundArrays.length > 0) {
                dataArray = foundArrays.sort((a, b) => b.length - a.length)[0];
            } else {
                dataArray = [jsonData];
            }
        }

        res.json({ stats: { success: ['KISI'], failed: [] }, data: dataArray });
        console.log(`✅ Sukses! ${dataArray.length} waran KISI berhasil ditarik.`);
    } catch (error) {
        console.error("❌ Error KISI:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Server mendengarkan seluruh jaringan pada port 3002
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Master Proxy Server (KGI, Maybank, RHB, CGSI, KISI) Berjalan di port ${PORT}`);
});

// Tambahkan di baris paling bawah master_proxy_server.js
module.exports = app;
