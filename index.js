const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// VERIFY TOKEN (used by Meta to confirm webhook)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});

// RECEIVE MESSAGES FROM WHATSAPP
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from; // WhatsApp user ID
      const msgText = message.text.body;

      console.log('User sent:', msgText);

      // CALL DEEPSEEK AI
      const aiReply = await getClaudeReply(msgText);

      // SEND BACK TO WHATSAPP
      await sendMessage(from, aiReply);
    }

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// DEEPSEEK AI FUNCTION
async function getClaudeReply(msg) {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: msg }],
      max_tokens: 100,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
    }
  );

  return response.data.choices[0].message.content;
}

// WHATSAPP MESSAGE SENDER
async function sendMessage(recipient, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneID = process.env.PHONE_NUMBER_ID;

  await axios.post(
    `https://graph.facebook.com/v19.0/${phoneID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      text: { body: text },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
