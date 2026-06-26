require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const twilio   = require('twilio');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 5600;

app.use(cors());
app.use(express.json());

// ── Inject Mapbox token into dashboard-boss.html via meta tag ──
app.get('/dashboard-boss.html', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'dashboard-boss.html'), 'utf8');
  const token = process.env.MAPBOX_TOKEN || '';
  html = html.replace('<head>', `<head>\n<meta name="mb" content="${token}">`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.use(express.static(path.join(__dirname)));

// ── Twilio client ──────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Data helpers ───────────────────────────────────────────────
const WORKERS_FILE = path.join(__dirname, 'data', 'workers.json');
const CONFIG_FILE  = path.join(__dirname, 'data', 'config.json');

function readWorkers() {
  if (!fs.existsSync(WORKERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(WORKERS_FILE, 'utf8'));
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// ── Routes ─────────────────────────────────────────────────────

// GET workers list
app.get('/api/workers', (req, res) => {
  res.json(readWorkers());
});

// GET boss config (phone number)
app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  // Never return full phone — mask middle digits for display
  if (cfg.bossPhone) {
    const p = cfg.bossPhone;
    cfg.bossPhoneMasked = p.slice(0, 3) + '***' + p.slice(-4);
  }
  delete cfg.bossPhone; // never send raw number to frontend
  res.json(cfg);
});

// POST save boss phone number
app.post('/api/config/boss-phone', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone.replace(/[\s\-().]/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }
  const cfg = readConfig();
  cfg.bossPhone = phone.replace(/[\s\-().]/g, '');
  writeConfig(cfg);
  res.json({ ok: true, message: 'Company phone saved.' });
});

// POST send SMS to one or more workers
app.post('/api/sms/send', async (req, res) => {
  const { workerIds, message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  if (!workerIds || !workerIds.length) {
    return res.status(400).json({ error: 'Select at least one recipient.' });
  }

  const workers = readWorkers();
  const targets = workers.filter(w => workerIds.includes(w.id) && w.phone);

  if (!targets.length) {
    return res.status(400).json({ error: 'No valid phone numbers found for selected workers.' });
  }

  const results = [];
  for (const worker of targets) {
    try {
      const msg = await twilioClient.messages.create({
        body: message.trim(),
        from: process.env.TWILIO_PHONE_NUMBER,
        to:   worker.phone
      });
      results.push({ workerId: worker.id, name: worker.name, status: 'sent', sid: msg.sid });
    } catch (err) {
      results.push({ workerId: worker.id, name: worker.name, status: 'failed', error: err.message });
    }
  }

  // Log to dispatch history
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message.trim(),
    results
  };
  const logFile = path.join(__dirname, 'data', 'sms-log.json');
  const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
  log.unshift(logEntry);
  fs.writeFileSync(logFile, JSON.stringify(log.slice(0, 200), null, 2)); // keep last 200

  const failed = results.filter(r => r.status === 'failed').length;
  res.json({
    ok: true,
    sent: results.filter(r => r.status === 'sent').length,
    failed,
    results
  });
});

// POST broadcast to ALL workers
app.post('/api/sms/broadcast', async (req, res) => {
  const workers = readWorkers();
  req.body.workerIds = workers.map(w => w.id);
  // reuse send logic
  return app._router.handle(
    Object.assign(req, { url: '/api/sms/send', method: 'POST' }),
    res,
    () => {}
  );
});

// GET dispatch history
app.get('/api/sms/log', (req, res) => {
  const logFile = path.join(__dirname, 'data', 'sms-log.json');
  if (!fs.existsSync(logFile)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(logFile, 'utf8')));
});

app.listen(PORT, () => {
  console.log(`OilManager running at http://localhost:${PORT}`);
});
