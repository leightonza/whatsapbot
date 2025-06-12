const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Root test
app.get('/', (req, res) => {
  res.send('👍 Bot is live');
});

// Webhook for WhatsApp or any message platform
app.post('/webhook', async (req, res) => {
  const message = req.body?.message || 'Hello';

  try {
    const reply = await getAIReply(message);
    res.json({ reply });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).send('Something went wrong.');
  }
});

// DeepSeek AI function
async function getAIReply(msg) {
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

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🟢 Bot is running on port ${PORT}`);
});
