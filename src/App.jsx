import React, { useState, useEffect, useRef } from 'react';

const CONSENT_VERSION = 'v1.0';
const DATA_KEY = 'rider_candidate_data';

function param(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function AiBadge() {
  return <div className="ai-badge">本服务由 AI 提供 · 你随时可以切换到人工</div>;
}

// ---------- 1. 入口页 ----------
function Entry({ onStart }) {
  return (
    <div className="screen">
      <AiBadge />
      <div className="hero">
        <div className="hero-logo">骑</div>
        <h1>骑手招募 · AI 助手</h1>
        <p className="sub">几分钟完成登记，了解政策，预约到站面试</p>
        <button className="primary big" onClick={onStart}>开始登记</button>
        <p className="tiny">来源渠道：{param('source_channel') || 'poster'}</p>
      </div>
    </div>
  );
}

// ---------- 2. 知情同意 ----------
function Consent({ onAgree, onDecline }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="screen">
      <AiBadge />
      <div className="card">
        <h2>知情同意</h2>
        <section>
          <h3>我们会收集</h3>
          <ul>
            <li>称呼、出生年月（仅年份月份）</li>
            <li>所在区/街道、求职意向</li>
            <li>是否有电动车、可开始时间、配送经验</li>
          </ul>
        </section>
        <section>
          <h3>我们不会收集</h3>
          <ul>
            <li>身份证号、银行卡、人脸等敏感信息</li>
            <li>与招募无关的个人资料</li>
          </ul>
        </section>
        <section>
          <h3>用途与留存</h3>
          <p>仅用于本次招募登记与面试预约；同意后 90 天内保留，到期自动删除或匿名化。</p>
        </section>
        <section>
          <h3>你的权利</h3>
          <p>可随时查看、更正、下载你的资料，或撤回同意并删除。也可随时切换到人工。</p>
        </section>
        <label className="check">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} data-testid="consent-check" />
          <span>我已阅读并同意上述说明（版本 {CONSENT_VERSION}）</span>
        </label>
        <button className="primary" disabled={!checked} onClick={onAgree} data-testid="consent-agree">同意并开始</button>
        <button className="ghost" onClick={onDecline} data-testid="consent-decline">不同意，转电话咨询</button>
      </div>
    </div>
  );
}

// ---------- 3. 对话页 ----------
function Chat({ sessionId, progress, onProgress, onDone, onHandoff, onMinor }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [quick, setQuick] = useState([]);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    // 开场：直接显示 AI 的第一句引导，不占用字段（问候不是答案）
    setMessages([{ role: 'ai', text: '你好！我是招募助手，几分钟帮你完成登记。请问怎么称呼您？' }]);
    // eslint-disable-next-line
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(text) {
    if (!text || busy) return;
    setBusy(true);
    setMessages(m => [...m, { role: 'user', text }]);
    setInput('');
    // 模拟断网：若离线则排队，重连后由 useEffect 重发（这里简化为提示）
    if (!online) {
      setMessages(m => [...m, { role: 'sys', text: '网络已断开，恢复后继续…' }]);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/v1/agent/sessions/${sessionId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'ai', text: data.reply, source: data.source }]);
      setQuick(data.quick_replies || []);
      if (data.progress) onProgress(data.progress);
      if (data.actions?.includes('show_stations')) onDone();
      if (data.actions?.includes('handoff')) onHandoff();
      if (data.actions?.includes('end_minor')) onMinor();
    } catch (e) {
      setMessages(m => [...m, { role: 'sys', text: '网络异常，请重试。' }]);
    } finally {
      setBusy(false);
    }
  }

  const pct = progress.total ? Math.round(progress.done / progress.total * 100) : 0;

  return (
    <div className="screen chat-screen">
      <AiBadge />
      <div className="progress-wrap">
        <div className="progress-label">资料进度 {progress.done}/{progress.total}</div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
      </div>
      <div className="messages" data-testid="messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>
            {m.source && <div className="source-tag">来源：{m.source.document} {m.source.version}</div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {quick.length > 0 && (
        <div className="quick-row">
          {quick.map((q, i) => <button key={i} className="quick" onClick={() => send(q)}>{q}</button>)}
        </div>
      )}
      <div className="input-row">
        <button className="icon-btn" onClick={() => send('政策')} title="咨询政策">政策</button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
               placeholder="输入回复…" data-testid="chat-input" />
        <button className="send" onClick={() => send(input)} disabled={busy} data-testid="chat-send">发送</button>
      </div>
      <div className="chat-actions">
        <button className="ghost small" onClick={() => setOnline(o => !o)} data-testid="toggle-network">
          {online ? '模拟断网' : '恢复网络'}
        </button>
        <button className="ghost small" onClick={onHandoff} data-testid="switch-human">切换人工</button>
        <button className="ghost small" onClick={() => window.location.href = '/#/selfservice'}>我的资料</button>
      </div>
    </div>
  );
}

// ---------- 4. 站点选择与预约 ----------
function Stations({ onBooked }) {
  const [stations, setStations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [slot, setSlot] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/stations').then(r => r.json()).then(d => { setStations(d.stations || []); setLoading(false); });
  }, []);

  async function book() {
    const res = await fetch('/api/v1/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_id: selected, slot_start: slot, session_id: localStorage.getItem('rider_session') })
    });
    const data = await res.json();
    if (data.id) onBooked(data);
    else alert('预约失败：' + (data.message || '请重试'));
  }

  return (
    <div className="screen">
      <AiBadge />
      <div className="card">
        <h2>选择面试站点</h2>
        {loading && <p>加载中…</p>}
        {!loading && stations.length === 0 && <p>附近暂无可预约名额，请切换人工咨询。</p>}
        {stations.map(s => (
          <div key={s.id} className={`station ${selected === s.id ? 'sel' : ''}`} onClick={() => { setSelected(s.id); setSlot(''); }} data-testid={'station-' + s.id}>
            <div className="station-name">{s.name}</div>
            <div className="station-meta">距你约 {s.distance_km} km · 剩余名额 {s.open_quota}</div>
          </div>
        ))}
        {selected && (
          <div className="slots">
            <h3>选择时段</h3>
            {(stations.find(s => s.id === selected)?.slots || []).map(t => (
              <button key={t} className={`slot ${slot === t ? 'sel' : ''}`} onClick={() => setSlot(t)} data-testid={'slot-' + t}>
                {new Date(t).toLocaleString('zh-CN')}
              </button>
            ))}
            <button className="primary" disabled={!slot} onClick={book} data-testid="book-btn">确认预约</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- 5. 结果页 ----------
function Result({ booking, onReset }) {
  return (
    <div className="screen">
      <AiBadge />
      <div className="card center">
        <div className="ok-icon">✓</div>
        <h2>预约成功</h2>
        <p>站点：{booking.station_id}</p>
        <p>时间：{new Date(booking.slot_start).toLocaleString('zh-CN')}</p>
        <p className="tiny">到站后请找站点负责人报到。可改期或取消。</p>
        <div className="row-btns">
          <button className="ghost" onClick={() => alert('已提交改期请求（示例）')}>改期</button>
          <button className="ghost" onClick={() => alert('已取消预约（示例）')}>取消</button>
          <button className="ghost" onClick={() => alert('正在呼叫站点虚拟号（示例）')}>联系站点</button>
        </div>
        <button className="primary" onClick={onReset}>返回首页</button>
      </div>
    </div>
  );
}

// ---------- 6. 自助服务 ----------
function SelfService() {
  const data = JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
  const [notice, setNotice] = useState('');
  function download() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'my-data.json'; a.click();
    setNotice('已下载你的资料副本');
  }
  function revoke() {
    localStorage.removeItem(DATA_KEY); localStorage.removeItem('rider_session');
    setNotice('已撤回同意并删除本地资料');
  }
  return (
    <div className="screen">
      <AiBadge />
      <div className="card">
        <h2>我的资料</h2>
        <pre className="data-view">{JSON.stringify(data, null, 2)}</pre>
        <button className="ghost" onClick={() => setNotice('可在此更正资料（示例）')}>查看 / 更正</button>
        <button className="ghost" onClick={download} data-testid="download-data">下载副本</button>
        <button className="danger" onClick={revoke} data-testid="revoke">撤回同意并删除</button>
        <button className="primary" onClick={() => { window.location.href = '/'; }}>返回</button>
        {notice && <p className="notice">{notice}</p>}
      </div>
    </div>
  );
}

// ---------- App 路由（hash） ----------
export default function App() {
  const [stage, setStage] = useState(() => window.location.hash === '#/selfservice' ? 'selfservice' : 'entry');
  const [sessionId, setSessionId] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 7, fields: [] });
  const [booking, setBooking] = useState(null);
  const [notice, setNotice] = useState('');

  async function createSession(consent) {
    const res = await fetch('/api/v1/agent/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    setSessionId(d.session_id);
    localStorage.setItem('rider_session', d.session_id);
    // 按契约回传同意版本与时间戳
    await fetch('/api/v1/consent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: CONSENT_VERSION, ...consent, source_channel: param('source_channel') })
    });
    setStage('chat');
  }

  if (stage === 'entry') return <Entry onStart={() => setStage('consent')} />;
  if (stage === 'consent') return (
    <Consent
      onAgree={() => createSession({ agreed: true, at: new Date().toISOString() })}
      onDecline={() => setNotice('已为你转接电话咨询（示例：请致电 400-000-0000）')}
    />
  );
  if (stage === 'chat') return (
    <Chat sessionId={sessionId} progress={progress} onProgress={setProgress}
      onDone={() => setStage('stations')}
      onHandoff={() => setNotice('已转接人工顾问，请稍候…')}
      onMinor={() => setNotice('未满 18 周岁，登记已终止。')}
    />
  );
  if (stage === 'stations') return <Stations onBooked={b => { setBooking(b); setStage('result'); }} />;
  if (stage === 'result') return <Result booking={booking} onReset={() => { setStage('entry'); setProgress({ done: 0, total: 7, fields: [] }); }} />;
  if (stage === 'selfservice') return <SelfService />;
  return null;
}
