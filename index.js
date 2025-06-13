require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = "VELDT"; // the same one you use on Meta

app.use(bodyParser.json());

// ✅ Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Message handling
app.post('/webhook', async (req, res) => {
  const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body;
  if (!message) return res.sendStatus(200);

  try {
    const reply = await getClaudeReply(message);
    console.log("AI reply:", reply);
  } catch (err) {
    console.error("DeepSeek error", err.message);
  }

  res.sendStatus(200);
});

// ✅ DeepSeek handler
async function getClaudeReply(msg) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: msg }],
      max_tokens: 100
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      }
    }
  );
  return response.data.choices[0].message.content;
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
