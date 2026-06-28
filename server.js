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

// ── Internal API key auth ──────────────────────────────────────
// All /api/* routes require x-api-key header matching INTERNAL_API_KEY
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!INTERNAL_API_KEY || key !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// ── Inject Mapbox token into dashboards via meta tag ──────────
const _injectToken = (file) => (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const token = process.env.MAPBOX_TOKEN || '';
  html = html.replace('<head>', `<head>\n<meta name="mb" content="${token}">`);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
app.get('/dashboard-boss.html',   _injectToken('dashboard-boss.html'));
app.get('/dashboard-worker.html', _injectToken('dashboard-worker.html'));

app.use(express.static(path.join(__dirname)));

// ── Twilio client ──────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ── Data helpers ───────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function writeConfig(data) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// ── Routes ─────────────────────────────────────────────────────

// GET boss config (phone number) — protected
app.get('/api/config', requireApiKey, (req, res) => {
  const cfg = readConfig();
  if (cfg.bossPhone) {
    const p = cfg.bossPhone;
    cfg.bossPhoneMasked = p.slice(0, 3) + '***' + p.slice(-4);
  }
  delete cfg.bossPhone;
  res.json(cfg);
});

// POST save boss phone number — protected
app.post('/api/config/boss-phone', requireApiKey, (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?[1-9]\d{9,14}$/.test(phone.replace(/[\s\-().]/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }
  const cfg = readConfig();
  cfg.bossPhone = phone.replace(/[\s\-().]/g, '');
  writeConfig(cfg);
  res.json({ ok: true, message: 'Company phone saved.' });
});

// POST send SMS — protected
// Body: { workerIds: string[], message: string, workers: [{id,name,phone}] }
// workers array is passed directly from Firebase data in the frontend
app.post('/api/sms/send', requireApiKey, async (req, res) => {
  const { workerIds, message, workers: fbWorkers } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  if (!workerIds || !workerIds.length) {
    return res.status(400).json({ error: 'Select at least one recipient.' });
  }

  // Use Firebase workers passed from frontend — no JSON file needed
  let targets = [];
  if (fbWorkers && fbWorkers.length) {
    targets = fbWorkers.filter(w => workerIds.includes(w.id) && w.phone);
  }

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
  fs.writeFileSync(logFile, JSON.stringify(log.slice(0, 200), null, 2));

  const failed = results.filter(r => r.status === 'failed').length;
  res.json({
    ok: true,
    sent: results.filter(r => r.status === 'sent').length,
    failed,
    results
  });
});

// POST broadcast to ALL workers — protected
// Body: { message: string, workers: [{id,name,phone}] }
app.post('/api/sms/broadcast', requireApiKey, async (req, res) => {
  const { message, workers: fbWorkers } = req.body;
  if (!fbWorkers || !fbWorkers.length) {
    return res.status(400).json({ error: 'No workers provided.' });
  }
  // Reuse send route logic with all worker IDs
  req.body.workerIds = fbWorkers.map(w => w.id);
  return app._router.handle(
    Object.assign(req, { url: '/api/sms/send', method: 'POST' }),
    res,
    () => {}
  );
});

// GET dispatch history — protected
app.get('/api/sms/log', requireApiKey, (req, res) => {
  const logFile = path.join(__dirname, 'data', 'sms-log.json');
  if (!fs.existsSync(logFile)) return res.json([]);
  res.json(JSON.parse(fs.readFileSync(logFile, 'utf8')));
});

app.listen(PORT, () => {
  console.log(`OilManager running at http://localhost:${PORT}`);
});
