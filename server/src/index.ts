import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.resolve(__dirname, '../public')));

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

function systemPrompt() {
  return [
    {
      role: 'system' as const,
      content:
        'You are InterviewReady, an expert AI interview coach. Ask realistic questions, probe for details, and give concise, actionable feedback and improved sample answers. Keep responses structured and to the point.',
    },
  ];
}

app.post('/api/coach', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body ?? {} as { message?: string; history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>; };
    const userMessage = typeof message === 'string' ? message : '';
    const prior = Array.isArray(history) ? history : [];

    const messages = [
      ...systemPrompt(),
      ...prior.map((m) => ({ role: m.role, content: String(m.content) })),
      { role: 'user' as const, content: userMessage || 'Give me a software engineering interview question.' },
    ];

    if (!openai) {
      const mock = (
        "Let's practice. Question: Describe a time you optimized a system. Use the STAR format. After your answer, I'll give targeted feedback and a stronger sample response."
      );
      return res.json({ reply: mock, model: 'mock' });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.6,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || 'I am ready to coach you.';
    return res.json({ reply, model: completion.model });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'AI service failed' });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`InterviewReady server listening on http://localhost:${port}`);
});
