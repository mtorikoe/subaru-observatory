/* ============================================================
   env.js — temperature and humidity charts (env tab)
   ============================================================ */
let envTemp = [];
let envHum  = [];
let envAnimT = 0;
let humidityInterval = null;

function initEnvTab() {
  generateEnvData();
  renderEnvCharts();
}

function generateEnvData() {
  const cfg = TEMPERATURE_CONFIG;
  envTemp = [];
  envHum  = [];
  const now = Date.now();
  for (let i = 59; i >= 0; i--) {
    const noise = (Math.random() - .5) * cfg.variation;
    envTemp.push(+(cfg.base + noise).toFixed(1));
    const hNoise = (Math.random() - .5) * 14;
    envHum.push(+(HUMIDITY_CONFIG.baseMin + Math.random() *
      (HUMIDITY_CONFIG.baseMax - HUMIDITY_CONFIG.baseMin) + hNoise * .3).toFixed(1));
  }
  G.temperature = envTemp[envTemp.length - 1];
  G.humidity    = Math.max(HUMIDITY_CONFIG.baseMin,
    Math.min(HUMIDITY_CONFIG.baseMax, envHum[envHum.length - 1]));
}

function tickEnv() {
  // Temperature tick
  const cfg = TEMPERATURE_CONFIG;
  const newT = +(G.temperature + (Math.random() - .5) * .4).toFixed(1);
  G.temperature = Math.max(cfg.min, Math.min(cfg.max, newT));
  envTemp.push(G.temperature); if (envTemp.length > 60) envTemp.shift();

  // Humidity tick — spike managed by startHumidityMonitor
  if (!G.humiditySpike) {
    const newH = +(G.humidity + (Math.random() - .5) * 2).toFixed(1);
    G.humidity = Math.max(HUMIDITY_CONFIG.baseMin,
      Math.min(HUMIDITY_CONFIG.baseMax, newH));
  }
  envHum.push(+(G.humidity).toFixed(1));
  if (envHum.length > 60) envHum.shift();

  // Humidity game-over if telescope open and humidity spikes mid-session
  if (G.enclosureOpen && G.humidity >= HUMIDITY_CONFIG.dangerThreshold && !G.gameOver) {
    triggerGameOver('humidity-spike');
  }

  renderEnvCharts();
  updateHumidityIndicator();
}

function startHumidityMonitor() {
  if (humidityInterval) return;
  humidityInterval = setInterval(() => {
    if (!G.gameOver && Math.random() < HUMIDITY_CONFIG.spikeChance * 2) {
      triggerHumiditySpike();
    }
  }, 500);
}

function triggerHumiditySpike() {
  if (G.humiditySpike) return;
  G.humiditySpike = true;
  G.humidity = HUMIDITY_CONFIG.spikeValue;
  termSystem('⚠ WARNING: Humidity spiking to ' + G.humidity + '% — above safe threshold!');
  // Game over if enclosure open
  if (G.enclosureOpen && !G.gameOver) {
    setTimeout(() => triggerGameOver('humidity-spike'), 1500);
  }
  G.humidityTimer = setTimeout(() => {
    G.humiditySpike = false;
    G.humidity = HUMIDITY_CONFIG.baseMax - 5;
  }, HUMIDITY_CONFIG.spikeDuration);
}

function renderEnvCharts() {
  renderLineChart('temp-chart', envTemp, '#7ecfed', '°C',
    TEMPERATURE_CONFIG.min - 1, TEMPERATURE_CONFIG.max + 1, false);
  renderLineChart('hum-chart', envHum, null, '%', 0, 100, true);
  document.getElementById('temp-current').textContent = G.temperature.toFixed(1) + ' °C';
  document.getElementById('hum-current').textContent  = G.humidity.toFixed(1) + ' %';
}

function renderLineChart(id, data, color, unit, yMin, yMax, isHumidity) {
  const cvs = document.getElementById(id);
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 240;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || Math.round(cvs.getBoundingClientRect().height) || 80;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

  const pad = { l:28, r:6, t:6, b:16 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const yRange = yMax - yMin;

  // Grid
  ctx.strokeStyle = '#1a4452'; ctx.lineWidth = .5;
  [0,.25,.5,.75,1].forEach(f => {
    const y = pad.t + f * ch;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
    const val = (yMax - f * yRange).toFixed(0);
    ctx.fillStyle = '#3a7088'; ctx.font = '8px Times New Roman';
    ctx.fillText(val, 2, y + 3);
  });

  if (!data || data.length < 2) return;
  const n = data.length;

  // Fill danger zone for humidity
  if (isHumidity) {
    const dangerY = pad.t + (1 - (HUMIDITY_CONFIG.dangerThreshold - yMin) / yRange) * ch;
    ctx.fillStyle = 'rgba(224,85,85,0.12)';
    ctx.fillRect(pad.l, pad.t, cw, dangerY - pad.t);
    ctx.strokeStyle = '#e05555'; ctx.lineWidth = .5; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(pad.l, dangerY); ctx.lineTo(pad.l+cw, dangerY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e05555'; ctx.font = '7px Times New Roman';
    ctx.fillText('70%', pad.l + 2, dangerY - 2);
  }

  // Line
  const lineColor = isHumidity
    ? (G.humidity >= HUMIDITY_CONFIG.dangerThreshold ? '#e05555' : '#7ecfed')
    : color;
  ctx.beginPath(); ctx.strokeStyle = lineColor; ctx.lineWidth = 1.5;
  data.forEach((v, i) => {
    const x = pad.l + (i / (n-1)) * cw;
    const y = pad.t + (1 - (v - yMin) / yRange) * ch;
    i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();

  // Current dot
  const lastV = data[data.length-1];
  const lx = pad.l + cw, ly = pad.t + (1 - (lastV - yMin) / yRange) * ch;
  ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI*2);
  ctx.fillStyle = lineColor; ctx.fill();
}

function updateHumidityIndicator() {
  const hum = G.humidity;
  const ind = document.getElementById('hum-indicator');
  if (!ind) return;
  const danger = hum >= HUMIDITY_CONFIG.dangerThreshold;
  ind.textContent = danger ? '⚠ HUMIDITY CRITICAL — NOT SAFE TO OBSERVE' : '✓ Humidity within safe range';
  ind.className = 'hum-indicator ' + (danger ? 'danger' : 'safe');
}