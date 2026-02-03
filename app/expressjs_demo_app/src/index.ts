import express from 'express';
import dotenv from 'dotenv';
import webhookRouter from './routes/webhook';
import apiRouter from './routes/api';
import prisma from './db/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store raw body for signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/webhook', webhookRouter);
app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.json({
    name: 'WhatsApp Express.js Demo',
    version: '1.0.0',
    endpoints: {
      'GET /webhook': 'Webhook verification',
      'POST /webhook': 'Receive webhook events',
      'POST /api/whatsapp': 'WhatsApp operations',
      'GET /api/health': 'Health check',
      'GET /api/debug/messages': 'View stored messages',
      'GET /api/debug/events': 'View webhook event log',
    },
  });
});

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
  });
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(console.error);
