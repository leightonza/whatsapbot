require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "VELDT";

// 🔓 Spreadsheet setup
const doc = new GoogleSpreadsheet('YOUR_GOOGLE_SHEET_ID'); // Replace with your sheet ID

app.use(bodyParser.json());

// ✅ Webhook verification for Meta
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log("🟢 WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("❌ Invalid verify token");
  }
});

// ✅ Handles incoming messages
app.post('/webhook', async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
    const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

    console.log("📩 User said:", msg);

    if (msg && from) {
      const reply = await getAIReply(msg);
      console.log("🤖 AI reply:", reply);
    }
  } catch (err) {
    console.error("⚠️ Error handling message:", err.message);
  }

  res.sendStatus(200);
});

// ✅ AI reply using Groq + memory from Google Sheets
async function loadSheetContent() {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });

  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows();

  let memory = '';
  rows.forEach(row => {
    memory += `\n\n${row.Section?.toUpperCase?.() || 'INFO'}:\n${row.Content || ''}`;
  });

  return memory;
}

async function getAIReply(msg) {
  try {
    const memory = await loadSheetContent();

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: memory },
          { role: "user", content: msg }
        ],
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("🔥 Groq error:", err.response?.data || err.message);
    return "Sorry, I couldn't process that.";
  }
}

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
