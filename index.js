require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "VELDT";

app.use(bodyParser.json());

// ✅ Meta Webhook Verification
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

// ✅ Incoming WhatsApp message
app.post('/webhook', async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
    const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

    console.log("📩 User said:", msg);

    if (msg && from) {
      const reply = await getAIReply(msg);
      console.log("🤖 AI reply:", reply);
      // Here you can send back the reply using the WhatsApp API if needed
    }
  } catch (err) {
    console.error("⚠️ Error handling message:", err.message);
  }

  res.sendStatus(200);
});

// ✅ Web-based test route (for curl or browser)
app.get('/', async (req, res) => {
  const msg = req.query.q || 'Hello';
  console.log("🌍 Received query:", msg);

  try {
    const reply = await getAIReply(msg);
    res.send(`<h3>🗣 You said: ${msg}</h3><h4>🤖 Bot replied: ${reply}</h4>`);
  } catch (err) {
    console.error("❌ Error in / route:", err.message);
    res.status(500).send("Error talking to the AI.");
  }
});

// ✅ AI logic using Groq (LLaMA3)
async function getAIReply(msg) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: `You are the AI assistant for Veldt Restaurant in Cape Town.
You know everything about the menu, hours, specials, and bookings.
Menu highlights: flame-grilled pork ribs, lamb potjie, Jack Black draught.
Address: 35 Main Road, Hout Bay.
Hours: Mon/Wed/Thurs 5–9:30pm, Fri–Sun 12–9:30pm.
Bookings via dineplan.com or call +27 61 911 5690 for large groups (15+).`
          },
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
