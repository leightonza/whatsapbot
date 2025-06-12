const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('👍 Bot is live'));

app.post('/webhook', async (req, res) => {
  const message = req.body?.message || 'Hello';
  try {
    const reply = await getClaudeReply(message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).send('Claude error');
  }
});

async function getClaudeReply(msg) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: msg }],
      max_tokens: 100
    },
    {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    }
  );
  return response.data.content[0].text;
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Bot running on ${PORT}`));
