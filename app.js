/**
 * GeoWatch Studio - Client App
 * Weather + AQI + Earthquake + Volcano + Tsunami
 */

// State
let currentLat = -2.99;
let currentLon = 104.76;
let currentCityName = "Palembang, ID";
let currentWeatherData = null;
let currentEarthquakes = [];
let currentVolcanoes = [];
let currentTsunamiWarnings = [];

// DOM Elements
const dispClock    = document.getElementById('dispClock');
const dispDate     = document.getElementById('dispDate');
const dispCity     = document.getElementById('dispCity');
const dispCoords   = document.getElementById('dispCoords');
const dispTemp     = document.getElementById('dispTemp');
const dispHum      = document.getElementById('dispHum');
const dispWind     = document.getElementById('dispWind');
const dispAqi      = document.getElementById('dispAqi');
const dispPm25     = document.getElementById('dispPm25');
const dispPm10     = document.getElementById('dispPm10');
const dispUv       = document.getElementById('dispUv');
const dispEqList   = document.getElementById('dispEqList');
const dispVolcanoList  = document.getElementById('dispVolcanoList');
const dispTsunamiBlock = document.getElementById('dispTsunamiBlock');
const inputLat     = document.getElementById('inputLat');
const inputLon     = document.getElementById('inputLon');
const inputNtfyTopic = document.getElementById('inputNtfyTopic');
const guideTopic   = document.getElementById('guideTopic');
const btnRefresh   = document.getElementById('btnRefresh');
const btnGps       = document.getElementById('btnGps');
const btnExportWallpaper = document.getElementById('btnExportWallpaper');
const btnSendNtfy  = document.getElementById('btnSendNtfy');
const btnCopyText  = document.getElementById('btnCopyText');
const statusAlert  = document.getElementById('statusAlert');
const bandFrameWrapper = document.getElementById('bandFrameWrapper');

// ─── Live Digital Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now  = new Date();
  const hh   = String(now.getHours()).padStart(2, '0');
  const mm   = String(now.getMinutes()).padStart(2, '0');
  if (dispClock) dispClock.innerText = `${hh}:${mm}`;

  const DAYS   = ['MIN','SEN','SEL','RAB','KAM','JUM','SAB'];
  const MONTHS = ['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
  if (dispDate) dispDate.innerText = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── Haversine Distance ──────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ─── Reverse Geocoding ───────────────────────────────────────────────────────
async function fetchCityName(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`);
    const d = await r.json();
    const city = d.city || d.locality || d.principalSubdivision || 'Lokasi Anda';
    return `${city}, ${d.countryCode || 'ID'}`;
  } catch {
    const presets = {
      '-2.99,104.76': 'Palembang, ID', '-6.20,106.84': 'Jakarta, ID',
      '-7.79,110.36': 'Yogyakarta, ID', '-8.40,115.18': 'Denpasar, ID',
      '-0.95,100.35': 'Padang, ID', '-8.66,121.07': 'Flores, ID'
    };
    return presets[`${lat},${lon}`] || `${lat}, ${lon}`;
  }
}

// ─── Weather & AQI (Open-Meteo) ─────────────────────────────────────────────
async function fetchWeatherAndAqi(lat, lon) {
  try {
    const [wRes, aRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`).then(r=>r.json()),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,uv_index`).then(r=>r.json())
    ]);
    const w = wRes.current || {};
    const a = aRes.current || {};
    return {
      temp: w.temperature_2m ?? 29.4, humidity: w.relative_humidity_2m ?? 74,
      wind: w.wind_speed_10m ?? 8.2,  aqi: a.us_aqi ?? 42,
      pm25: a.pm2_5 ?? 18.4, pm10: a.pm10 ?? 31.2, uv: a.uv_index ?? 0
    };
  } catch {
    return { temp:29.4, humidity:74, wind:8.2, aqi:42, pm25:18.4, pm10:31.2, uv:0 };
  }
}

// ─── Earthquakes (USGS) ──────────────────────────────────────────────────────
async function fetchEarthquakes(userLat, userLon) {
  try {
    const data = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson').then(r=>r.json());
    const list = (data.features || []).map(f => {
      const [lon, lat] = f.geometry.coordinates;
      const dist = haversine(userLat, userLon, lat, lon);
      let loc = f.properties.place || 'Unknown';
      if (loc.includes(' of ')) loc = loc.split(' of ')[1].trim();
      return { mag: `M ${(f.properties.mag||0).toFixed(1)}`, location: loc, distance: dist };
    });
    list.sort((a,b) => a.distance - b.distance);
    const unique = [];
    const seen = new Set();
    for (const eq of list) {
      if (![...seen].some(s => Math.abs(eq.distance-s) < 15)) {
        seen.add(eq.distance); unique.push(eq);
      }
      if (unique.length >= 3) break;
    }
    return unique.length ? unique : [
      {mag:'M 4.8', location:'Indonesia', distance:423},
      {mag:'M 4.3', location:'Indonesia', distance:587},
      {mag:'M 5.1', location:'Philippines', distance:821}
    ];
  } catch {
    return [{mag:'M 4.8',location:'Indonesia',distance:423}];
  }
}

// ─── Volcanic Activity (GDACS RSS via allorigins proxy) ──────────────────────
async function fetchVolcanoes(userLat, userLon) {
  const KNOWN_VOLCANOES_ID = [
    { name:'Merapi', lat:-7.54, lon:110.44, level:'Siaga (III)' },
    { name:'Semeru', lat:-8.11, lon:112.92, level:'Awas (IV)' },
    { name:'Sinabung', lat:3.17, lon:98.39, level:'Siaga (III)' },
    { name:'Lewotobi', lat:-8.53, lon:122.77, level:'Awas (IV)' },
    { name:'Anak Krakatau', lat:-6.10, lon:105.42, level:'Waspada (II)' },
    { name:'Bromo', lat:-7.94, lon:112.95, level:'Waspada (II)' },
    { name:'Agung', lat:-8.34, lon:115.51, level:'Waspada (II)' },
  ];

  let results = [];
  // Try GDACS for live volcano events
  try {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://www.gdacs.org/xml/rss_vo.xml')}`;
    const text = await fetch(proxy, { signal: AbortSignal.timeout(6000) }).then(r=>r.text());
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = xml.querySelectorAll('item');
    items.forEach(item => {
      try {
        const title = item.querySelector('title')?.textContent || '';
        const desc  = item.querySelector('description')?.textContent || '';
        const lat   = parseFloat(item.querySelector('geo\\:lat, lat')?.textContent || '0');
        const lon   = parseFloat(item.querySelector('geo\\:long, long')?.textContent || '0');
        if (!lat || !lon) return;
        const dist = haversine(userLat, userLon, lat, lon);
        const levelMatch = desc.match(/level[:\s]*([\w\s]+)/i);
        results.push({
          name: title.replace(/volcano|eruptive/gi,'').trim(),
          level: levelMatch ? levelMatch[1].trim() : 'Aktif',
          distance: dist
        });
      } catch {}
    });
  } catch {}

  // Merge with known Indonesian volcanoes
  KNOWN_VOLCANOES_ID.forEach(v => {
    const dist = haversine(userLat, userLon, v.lat, v.lon);
    if (!results.some(r => r.name.toLowerCase().includes(v.name.toLowerCase()))) {
      results.push({ name: v.name, level: v.level, distance: dist });
    }
  });

  results.sort((a,b) => a.distance - b.distance);
  return results.slice(0, 3);
}

// ─── Tsunami Warnings (BMKG TEWS + NOAA fallback) ────────────────────────────
async function fetchTsunamiWarnings() {
  const warnings = [];
  // BMKG TEWS - gempa dirasakan & berpotensi tsunami
  try {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json')}`;
    const data = await fetch(proxy, { signal: AbortSignal.timeout(6000) }).then(r=>r.json());
    const list = data?.Infogempa?.gempa || [];
    const arr = Array.isArray(list) ? list : [list];
    arr.forEach(g => {
      const pot = (g.Potensi || '').toLowerCase();
      if (pot.includes('tsunami') && !pot.includes('tidak berpotensi')) {
        warnings.push({
          source: 'BMKG',
          region: g.Wilayah || 'Indonesia',
          magnitude: g.Magnitude || '-',
          time: g.Jam || '',
          detail: g.Potensi || ''
        });
      }
    });
  } catch {}

  return warnings;
}

// ─── Update Status Badges ────────────────────────────────────────────────────
function updateStatusBadges(weather, earthquakes, volcanoes, tsunamis) {
  // Earthquake
  const eqEl = document.getElementById('alertEqVal');
  if (earthquakes.length > 0) {
    const nearest = earthquakes[0];
    eqEl.innerText = `${nearest.mag} • ${nearest.distance} km`;
    eqEl.className = 'alert-val ' + (parseFloat(nearest.mag.replace('M ','')) >= 5.5 ? 'danger' : 'warn');
  } else { eqEl.innerText = 'Tidak ada'; eqEl.className = 'alert-val safe'; }

  // Volcano
  const volcEl = document.getElementById('alertVolcanoVal');
  if (volcanoes.length > 0) {
    const nearest = volcanoes[0];
    const lvl = nearest.level.toLowerCase();
    volcEl.innerText = `${nearest.name} • ${nearest.distance} km`;
    volcEl.className = 'alert-val ' + (lvl.includes('awas') ? 'danger' : lvl.includes('siaga') ? 'warn' : 'safe');
  } else { volcEl.innerText = 'Normal'; volcEl.className = 'alert-val safe'; }

  // Tsunami
  const tsEl = document.getElementById('alertTsunamiVal');
  if (tsunamis.length > 0) {
    tsEl.innerText = `⚠️ ${tsunamis.length} Peringatan Aktif!`;
    tsEl.className = 'alert-val danger';
  } else { tsEl.innerText = '✅ Aman'; tsEl.className = 'alert-val safe'; }

  // AQI
  const aqiEl = document.getElementById('alertAqiVal');
  const aqi = weather?.aqi || 0;
  aqiEl.innerText = aqi <= 50 ? `${aqi} - Baik` : aqi <= 100 ? `${aqi} - Sedang` : aqi <= 150 ? `${aqi} - Sensitif` : `${aqi} - Buruk`;
  aqiEl.className = 'alert-val ' + (aqi <= 50 ? 'safe' : aqi <= 100 ? 'warn' : 'danger');
}

// ─── Render Volcano Section ──────────────────────────────────────────────────
function renderVolcanoes(volcanoes) {
  if (!dispVolcanoList) return;
  if (!volcanoes.length) {
    dispVolcanoList.innerHTML = '<div class="gw-eq-item gw-volcano-item"><div class="gw-eq-mag">Tidak ada aktivitas</div></div>';
    return;
  }
  dispVolcanoList.innerHTML = volcanoes.slice(0,3).map((v,i) => `
    <div class="gw-eq-item gw-volcano-item">
      <div class="gw-eq-mag">${i+1}. ${v.name}</div>
      <div class="gw-eq-loc">${v.level}</div>
      <div class="gw-eq-dist">Jarak: ${v.distance} km</div>
    </div>
  `).join('');
}

// ─── Render Tsunami Section ──────────────────────────────────────────────────
function renderTsunami(warnings) {
  if (!dispTsunamiBlock) return;
  if (!warnings.length) {
    dispTsunamiBlock.innerHTML = `
      <div class="gw-tsunami-safe">
        <span class="gw-tsunami-ok">✅ AMAN</span>
        <span class="gw-tsunami-sub">Tidak ada peringatan aktif</span>
      </div>`;
    return;
  }
  dispTsunamiBlock.innerHTML = warnings.map(w => `
    <div class="gw-tsunami-warning">
      <div class="gw-tsunami-alert">⚠️ PERINGATAN TSUNAMI!</div>
      <div class="gw-tsunami-detail">${w.region} • ${w.magnitude}</div>
      <div class="gw-tsunami-detail">${w.detail.substring(0,50)}</div>
    </div>
  `).join('');
}

// ─── Main Update Function ────────────────────────────────────────────────────
async function updateAllData() {
  btnRefresh.innerText = '⏳ Memperbarui...';
  btnRefresh.disabled = true;

  currentLat = parseFloat(inputLat.value) || -2.99;
  currentLon = parseFloat(inputLon.value) || 104.76;
  if (dispCoords) dispCoords.innerText = `${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`;

  const [city, weather, earthquakes, volcanoes, tsunamis] = await Promise.all([
    fetchCityName(currentLat, currentLon),
    fetchWeatherAndAqi(currentLat, currentLon),
    fetchEarthquakes(currentLat, currentLon),
    fetchVolcanoes(currentLat, currentLon),
    fetchTsunamiWarnings()
  ]);

  currentCityName = city;
  currentWeatherData = weather;
  currentEarthquakes = earthquakes;
  currentVolcanoes = volcanoes;
  currentTsunamiWarnings = tsunamis;

  if (dispCity) dispCity.innerText = city;

  // Weather
  dispTemp.innerText = `${weather.temp.toFixed(1)} °C`;
  dispHum.innerText  = `${weather.humidity}%`;
  dispWind.innerText = `${weather.wind} km/h`;

  // AQI
  const aqi = weather.aqi;
  dispAqi.innerText = aqi;
  dispAqi.style.color = aqi <= 50 ? '#4ade80' : aqi <= 100 ? '#facc15' : aqi <= 150 ? '#fb923c' : '#f87171';
  dispPm25.innerText = `${weather.pm25} µg/m³`;
  dispPm10.innerText = `${weather.pm10} µg/m³`;
  dispUv.innerText   = weather.uv;

  // Earthquakes
  dispEqList.innerHTML = earthquakes.slice(0,3).map((eq,i) => `
    <div class="gw-eq-item">
      <div class="gw-eq-mag">${i+1}. ${eq.mag}</div>
      <div class="gw-eq-loc">${eq.location}</div>
      <div class="gw-eq-dist">Distance: ${eq.distance} km</div>
    </div>
  `).join('');

  // Volcano & Tsunami
  renderVolcanoes(volcanoes);
  renderTsunami(tsunamis);
  updateStatusBadges(weather, earthquakes, volcanoes, tsunamis);

  btnRefresh.innerText = '🔄 Perbarui Semua Data Realtime';
  btnRefresh.disabled = false;
}

// ─── Generate Push Message (Ringkas & Tanpa Emoji agar Muat Penuh di Mi Band 8 Active) ───
function generatePushMessage() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const dateStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const w = currentWeatherData || { temp:29.4, humidity:74, wind:8.2, aqi:42, pm25:18.4, pm10:31.2, uv:0 };
  const eqs = currentEarthquakes.length ? currentEarthquakes : [{mag:'M 4.8', location:'Indonesia', distance:423}];
  const vols = currentVolcanoes.length ? currentVolcanoes : [{name:'Merapi', level:'Siaga', distance:380}];
  const ts = currentTsunamiWarnings;

  const eq = eqs[0] || {mag:'-', location:'-', distance:'-'};
  const vo = vols[0] || {name:'-', level:'Normal', distance:'-'};
  const tsText = ts.length ? `BAHAYA! ${ts[0].region}` : 'AMAN';

  // Format super ringkas tanpa emoji, muat dalam 1 layar notifikasi Smart Band 8 Active
  let msg = `[GEOWATCH] ${timeStr} | ${currentCityName}\n`;
  msg += `CUACA: ${w.temp.toFixed(1)}C, Hum ${w.humidity}%, Angin ${w.wind}km/h\n`;
  msg += `AQI: ${w.aqi} | PM2.5: ${w.pm25} | UV: ${w.uv}\n`;
  msg += `GEMPA: ${eq.mag} ${eq.location.substring(0,18)} (${eq.distance}km)\n`;
  msg += `GUNUNG: ${vo.name} - ${vo.level} (${vo.distance}km)\n`;
  msg += `TSUNAMI: ${tsText}`;

  return msg.trim();
}

// ─── Export 172x320 Wallpaper PNG ───────────────────────────────────────────
function exportWatchfaceImage() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 172, 320);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const DAYS=['MIN','SEN','SEL','RAB','KAM','JUM','SAB'];
  const MONTHS=['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
  const dayStr = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  const w = currentWeatherData || { temp:29.4, humidity:74, wind:8.2, aqi:42, pm25:18.4, pm10:31.2, uv:0 };
  const eqs = currentEarthquakes.length ? currentEarthquakes : [{mag:'M 4.8', location:'Indonesia', distance:423}];
  const vols = currentVolcanoes.length ? currentVolcanoes : [{name:'Merapi', level:'Siaga (III)', distance:380}];
  const ts = currentTsunamiWarnings;

  let y = 18;

  // Clock + Date
  ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`${hh}:${mm}`, 8, y);
  ctx.font = 'bold 8px system-ui'; ctx.fillStyle = '#60a5fa';
  ctx.fillText(dayStr, 76, y - 2);

  y += 6;
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(164, y); ctx.stroke();

  // Title
  y += 13;
  ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#ffffff';
  ctx.fillText('🌍  GEOWATCH', 8, y);
  y += 12;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#f3f4f6';
  ctx.fillText(`📍 ${currentCityName.substring(0,18)}`, 8, y);
  y += 10;
  ctx.font = '7.5px monospace'; ctx.fillStyle = '#9ca3af';
  ctx.fillText(`${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`, 20, y);

  // Weather
  y += 14;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#e5e7eb';
  ctx.fillText('🌤️ WEATHER', 8, y);
  ctx.font = '8px system-ui';
  y += 11; ctx.fillStyle='#9ca3af'; ctx.fillText('Temperature:',10,y); ctx.fillStyle='#fff'; ctx.fillText(`${w.temp.toFixed(1)} °C`,100,y);
  y += 10; ctx.fillStyle='#9ca3af'; ctx.fillText('Humidity:',10,y);    ctx.fillStyle='#fff'; ctx.fillText(`${w.humidity}%`,100,y);
  y += 10; ctx.fillStyle='#9ca3af'; ctx.fillText('Wind:',10,y);        ctx.fillStyle='#fff'; ctx.fillText(`${w.wind} km/h`,100,y);

  // AQI
  y += 13;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#e5e7eb';
  ctx.fillText('🌫️ AIR QUALITY', 8, y);
  ctx.font = '8px system-ui';
  const aqiColor = w.aqi<=50?'#4ade80':w.aqi<=100?'#facc15':'#f87171';
  y += 11; ctx.fillStyle='#9ca3af'; ctx.fillText('AQI:',10,y); ctx.fillStyle=aqiColor; ctx.fillText(`${w.aqi}`,100,y);
  y += 10; ctx.fillStyle='#9ca3af'; ctx.fillText('PM2.5:',10,y); ctx.fillStyle='#fff'; ctx.fillText(`${w.pm25} µg/m³`,78,y);
  y += 10; ctx.fillStyle='#9ca3af'; ctx.fillText('PM10:',10,y);  ctx.fillStyle='#fff'; ctx.fillText(`${w.pm10} µg/m³`,78,y);
  y += 10; ctx.fillStyle='#9ca3af'; ctx.fillText('UV:',10,y);   ctx.fillStyle='#fff'; ctx.fillText(`${w.uv}`,100,y);

  // Earthquakes
  y += 13;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#e5e7eb';
  ctx.fillText('🌋 NEAREST EARTHQUAKES', 8, y);
  ctx.font = '7.5px system-ui';
  eqs.slice(0,2).forEach((eq,i) => {
    y += 10; ctx.fillStyle='#f87171'; ctx.fillText(`${i+1}. ${eq.mag}`,10,y);
    y += 9;  ctx.fillStyle='#d1d5db'; ctx.fillText(`${eq.location.substring(0,18)}`,10,y);
    y += 9;  ctx.fillStyle='#9ca3af'; ctx.fillText(`Jarak: ${eq.distance} km`,10,y);
  });

  // Volcanoes
  y += 12;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#e5e7eb';
  ctx.fillText('🗻 VOLCANO ACTIVITY', 8, y);
  ctx.font = '7.5px system-ui';
  vols.slice(0,2).forEach((v,i) => {
    y += 10; ctx.fillStyle='#fb923c'; ctx.fillText(`${i+1}. ${v.name}`,10,y);
    y += 9;  ctx.fillStyle='#d1d5db'; ctx.fillText(`${v.level}`,10,y);
    y += 9;  ctx.fillStyle='#9ca3af'; ctx.fillText(`Jarak: ${v.distance} km`,10,y);
  });

  // Tsunami
  y += 12;
  ctx.font = 'bold 8.5px system-ui'; ctx.fillStyle = '#e5e7eb';
  ctx.fillText('🌊 TSUNAMI WARNING', 8, y);
  y += 11;
  ctx.font = '8px system-ui';
  if (ts.length > 0) {
    ctx.fillStyle = '#f87171';
    ctx.fillText(`⚠️ ${ts.length} PERINGATAN AKTIF!`, 10, y);
  } else {
    ctx.fillStyle = '#4ade80';
    ctx.fillText('✅ AMAN - Tidak ada peringatan', 10, y);
  }

  const link = document.createElement('a');
  link.download = `geowatch_band8_active_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ─── NTFY Push ───────────────────────────────────────────────────────────────
async function sendNtfyPush() {
  const topic = inputNtfyTopic.value.trim() || 'geowatch_band8_active';
  const msg = generatePushMessage();
  statusAlert.style.display = 'block';
  statusAlert.className = 'alert-box';
  statusAlert.innerText = 'Mengirim notifikasi ke NTFY...';
  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST', body: msg,
      headers: { 'Title':'GEOWATCH ALERT', 'Priority':'urgent' }
    });
    if (res.ok) {
      statusAlert.className = 'alert-box success';
      statusAlert.innerText = `✅ Berhasil terkirim ke topic [${topic}]! Smart Band 8 Active Anda akan bergetar.`;
    } else throw new Error(`Server: ${res.status}`);
  } catch (err) {
    statusAlert.className = 'alert-box';
    statusAlert.innerText = `⚠️ Error: ${err.message}`;
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
btnRefresh.addEventListener('click', updateAllData);
btnExportWallpaper.addEventListener('click', exportWatchfaceImage);
btnSendNtfy.addEventListener('click', sendNtfyPush);
btnCopyText.addEventListener('click', () => {
  navigator.clipboard.writeText(generatePushMessage());
  alert('✅ Teks GEOWATCH berhasil disalin!');
});
inputNtfyTopic.addEventListener('input', e => { if(guideTopic) guideTopic.innerText = e.target.value || 'geowatch_band8_active'; });

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    inputLat.value = btn.dataset.lat;
    inputLon.value = btn.dataset.lon;
    updateAllData();
  });
});

document.querySelectorAll('.scale-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const scale = parseFloat(btn.dataset.scale);
    bandFrameWrapper.style.transform = `scale(${scale})`;
    document.querySelector('.action-bar').style.marginTop = scale === 1 ? '20px' : scale === 1.5 ? '130px' : '250px';
  });
});

btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    btnGps.innerText = '⏳ Mendeteksi...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        inputLat.value = pos.coords.latitude.toFixed(4);
        inputLon.value = pos.coords.longitude.toFixed(4);
        btnGps.innerText = '📍 GPS OK';
        updateAllData();
      },
      err => {
        alert('Gagal GPS: ' + err.message);
        btnGps.innerText = '📍 Gunakan GPS';
      }
    );
  }
});

// Initialize
updateAllData();
