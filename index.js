require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "VELDT";

app.use(bodyParser.json());

// ✅ Meta Webhook Verification Route
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

// ✅ Incoming WhatsApp Message Handler
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

// ✅ AI Function - uses OpenRouter's free model
async function getAIReply(msg) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openchat/openchat-3.5',
        messages: [
          { role: 'system', content: 'You are a helpful WhatsApp assistant.' },
          { role: 'user', content: msg }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://whatsappaibot-4spb.onrender.com',
          'X-Title': 'WhatsApp Bot'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err) {
    console.error("🔥 OpenRouter error:", err.response?.data || err.message);
    return "Sorry, I couldn't process that.";
  }
}

// ✅ Start Express server
app.listen(PORT, () => {
  console.log(`🟢 Server running on port ${PORT}`);
});
