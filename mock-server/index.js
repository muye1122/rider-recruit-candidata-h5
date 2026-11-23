/**
 * Mock service for Task 2/5 (job-seeker H5).
 * Implements the Shared Interface Contract v1 endpoints that Task 2 depends on:
 *   - Task 1 agent session API (messages -> reply + quick_replies + progress + actions)
 *   - Task 3 station & booking API
 *   - Task 5 vault tokenize (masking)
 * All data is synthetic. No real personal information. No overseas LLM calls.
 */
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ---------- synthetic data ----------
const STATIONS = [
  { id: 'st-001', name: '中心站（示例）', lat: 28.19, lng: 112.98, open_quota: 12,
    slots: ['2026-11-24T10:00:00+08:00', '2026-11-24T14:00:00+08:00', '2026-11-25T09:30:00+08:00'] },
  { id: 'st-002', name: '河东站（示例）', lat: 28.23, lng: 113.05, open_quota: 5,
    slots: ['2026-11-24T11:00:00+08:00', '2026-11-25T15:00:00+08:00'] },
  { id: 'st-003', name: '西郊站（示例）', lat: 28.15, lng: 112.91, open_quota: 0,
    slots: [] },
];

const POLICIES = [
  { id: 'pol-001', city: '示例市', version: 'v1.2', topic: '入职年龄',
    text: '需年满 18 周岁。未满 18 周岁不进入招募流程。', source: '示例招募政策 v1.2' },
  { id: 'pol-002', city: '示例市', version: 'v1.2', topic: '健康证',
    text: '需提供有效健康证或办理中证明，具体以站点通知为准。', source: '示例招募政策 v1.2' },
  { id: 'pol-003', city: '示例市', version: 'v1.2', topic: '车辆要求',
    text: '自带电动车或可租赁，需符合当地上路规范。', source: '示例招募政策 v1.2' },
  { id: 'pol-004', city: '示例市', version: 'v1.2', topic: '收入说明',
    text: '收入与订单量、时长等因素相关，以实际结算为准，不作具体金额承诺。', source: '示例招募政策 v1.2' },
];

// 7 registration fields in contract order
const FIELDS = ['name', 'birth_ym', 'area_text', 'job_type', 'has_ebike', 'start_text', 'experience_text'];
const FIELD_QUESTIONS = {
  name: '请问怎么称呼您？',
  birth_ym: '请问您的出生年月？（如 1991-05）',
  area_text: '您住在哪个区/街道附近？',
  job_type: '您想做全职还是兼职？',
  has_ebike: '您有电动车吗？',
  start_text: '您大约什么时候可以开始？',
  experience_text: '您有配送相关经验吗？',
};
const FIELD_QUICK = {
  job_type: ['全职', '兼职', '还没想好'],
  has_ebike: ['有', '没有'],
  start_text: ['尽快', '一周内', '两周后'],
  experience_text: ['有', '没有'],
};

// ---------- helpers ----------
const sessions = new Map();

function maskPhone(v) {
  const s = String(v || '');
  if (s.length >= 7) return s.slice(0, 3) + '****' + s.slice(-4);
  return '***';
}
function maskName(v) {
  const s = String(v || '');
  return s.length > 1 ? s[0] + '**' : '*';
}
function extractField(field, text) {
  const t = String(text || '').trim();
  if (!t) return null;
  switch (field) {
    case 'name':
      return t.length <= 20 ? t : null;
    case 'birth_ym': {
      let m = t.match(/((?:19|20)\d{2})[-\/年.]?\s*(\d{1,2})/);
      if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}`;
      m = t.match(/(\d{2})\s*年?\s*(\d{1,2})/); // 口语 "91年5"
      if (m) return `19${m[1]}-${String(m[2]).padStart(2, '0')}`;
      return null;
    }
    case 'area_text':
      return t.length <= 60 ? t : null;
    case 'job_type':
      if (/兼职|part.?time/i.test(t)) return 'parttime';
      if (/全职|full.?time/i.test(t)) return 'fulltime';
      if (/没想好|待定|不确定/.test(t)) return 'undecided';
      return null;
    case 'has_ebike':
      if (/^(有|是|yes|有车)/i.test(t)) return true;
      if (/^(没有|无|不是|no)/i.test(t)) return false;
      return null;
    case 'start_text':
      return t.length <= 40 ? t : null;
    case 'experience_text':
      return t.length <= 200 ? t : null;
    default:
      return null;
  }
}
function isMinor(birthYm) {
  if (!birthYm) return false;
  const [y, m] = birthYm.split('-').map(Number);
  if (!y || !m) return false;
  const born = new Date(y, m - 1, 1);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m) age -= 1;
  return age < 18;
}
function nextMissing(data) {
  return FIELDS.find(f => data[f] === undefined || data[f] === null) || null;
}
function progress(data) {
  const done = FIELDS.filter(f => data[f] !== undefined && data[f] !== null);
  return { done: done.length, total: FIELDS.length, fields: done };
}

// ---------- routes ----------
app.get('/api/v1/health', (_req, res) => res.json({ ok: true, service: 'mock', ts: Date.now() }));

// Task 5 vault mock: tokenize / detokenize
app.post('/api/v1/vault/tokenize', (req, res) => {
  const { type, value } = req.body || {};
  const token = `tok_${crypto.randomBytes(6).toString('hex')}`;
  res.json({ token, type, masked: type === 'phone' ? maskPhone(value) : maskName(value) });
});
app.post('/api/v1/vault/detokenize', (req, res) => {
  // mock: requires reason
  if (!req.body || !req.body.reason) return res.status(400).json({ code: 'REASON_REQUIRED', message: 'reason required' });
  res.json({ value: '13800000000（示例）' });
});

// Task 1 agent session mock
app.post('/api/v1/agent/sessions', (_req, res) => {
  const session_id = 'sess_' + crypto.randomBytes(8).toString('hex');
  sessions.set(session_id, { data: {}, messages: [], consent: null });
  res.json({ session_id });
});

app.post('/api/v1/agent/sessions/:id/messages', (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'session not found' });
  const text = String((req.body && req.body.text) || '');
  s.messages.push(text);

  // policy Q&A takes priority when asking about policy topics
  const policyHit = POLICIES.find(p =>
    /政策|规定|年龄|健康证|车辆|收入|多少钱|要求/.test(text) && new RegExp(p.topic).test(text));
  if (policyHit) {
    return res.json({
      reply: `${policyHit.text}（来源：${policyHit.source}）`,
      quick_replies: [], progress: progress(s.data), actions: [],
      source: { document: policyHit.source, version: policyHit.version }
    });
  }
  if (/政策|规定|要求/.test(text) && !policyHit) {
    return res.json({
      reply: '这个问题我暂时没有找到可靠依据，已为你转接人工确认，不会随意作答。',
      quick_replies: [], progress: progress(s.data), actions: ['handoff']
    });
  }

  const field = nextMissing(s.data);
  if (!field) {
    return res.json({
      reply: '信息已收集完整。请选择附近站点并预约到站面试时间。',
      quick_replies: [], progress: progress(s.data), actions: ['show_stations']
    });
  }

  // first message could be the answer to the greeting question; try extract
  const val = extractField(field, text);
  if (val !== null) {
    s.data[field] = val;
    if (field === 'birth_ym' && isMinor(val)) {
      return res.json({
        reply: '抱歉，本岗位需年满 18 周岁，当前无法继续登记。感谢你的关注。',
        quick_replies: [], progress: progress(s.data), actions: ['end_minor']
      });
    }
    const nf = nextMissing(s.data);
    if (!nf) {
      return res.json({
        reply: '信息已收集完整。请选择附近站点并预约到站面试时间。',
        quick_replies: [], progress: progress(s.data), actions: ['show_stations']
      });
    }
    return res.json({
      reply: `已记录。${FIELD_QUESTIONS[nf]}`,
      quick_replies: FIELD_QUICK[nf] || [],
      progress: progress(s.data), actions: []
    });
  }

  return res.json({
    reply: FIELD_QUESTIONS[field],
    quick_replies: FIELD_QUICK[field] || [],
    progress: progress(s.data), actions: []
  });
});

// Task 3 station & booking mock
app.get('/api/v1/stations', (req, res) => {
  const list = STATIONS.filter(s => s.open_quota > 0).map(s => ({
    id: s.id, name: s.name, distance_km: +(Math.random() * 5 + 0.5).toFixed(1),
    open_quota: s.open_quota, slots: s.slots
  }));
  res.json({ stations: list });
});

const bookings = new Map();
app.post('/api/v1/bookings', (req, res) => {
  const { station_id, slot_start, session_id } = req.body || {};
  const st = STATIONS.find(s => s.id === station_id);
  if (!st) return res.status(404).json({ code: 'STATION_NOT_FOUND', message: 'station not found' });
  if (!st.slots.includes(slot_start)) return res.status(400).json({ code: 'SLOT_UNAVAILABLE', message: 'slot unavailable' });
  const id = 'bk_' + crypto.randomBytes(6).toString('hex');
  const booking = { id, station_id, slot_start, status: 'booked', session_id, created_at: new Date().toISOString() };
  bookings.set(id, booking);
  res.json(booking);
});
app.patch('/api/v1/bookings/:id/cancel', (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ code: 'NOT_FOUND', message: 'booking not found' });
  b.status = 'cancelled';
  res.json(b);
});

// Consent version/timestamp echo (per contract)
app.post('/api/v1/consent', (req, res) => {
  res.json({ consent_version: req.body?.version || 'v1.0', consent_at: new Date().toISOString(), received: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock] listening on http://0.0.0.0:${PORT}`);
});
