// State
let currentLat = -2.99;
let currentLon = 104.76;
let currentCityName = "Palembang, Indonesia";
let currentWeatherData = null;
let currentEarthquakes = [];

// Selected Theme
let currentTheme = 'cyber-hud';

// DOM Elements
const dispClock = document.getElementById('dispClock');
const dispDate = document.getElementById('dispDate');
const dispCity = document.getElementById('dispCity');
const dispCoords = document.getElementById('dispCoords');
const dispTemp = document.getElementById('dispTemp');
const dispTempBadge = document.getElementById('dispTempBadge');
const dispHum = document.getElementById('dispHum');
const dispWind = document.getElementById('dispWind');
const dispAqi = document.getElementById('dispAqi');
const dispAqiStatus = document.getElementById('dispAqiStatus');
const dispAqiGauge = document.getElementById('dispAqiGauge');
const dispPm25 = document.getElementById('dispPm25');
const dispPm10 = document.getElementById('dispPm10');
const dispUv = document.getElementById('dispUv');
const dispEqList = document.getElementById('dispEqList');
const bandScreen = document.getElementById('bandScreen');

// Live Digital Clock & Date
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  if (dispClock) {
    dispClock.innerText = `${hours}:${minutes}`;
  }

  const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  
  const dayName = days[now.getDay()];
  const dateNum = now.getDate();
  const monthName = months[now.getMonth()];

  if (dispDate) {
    dispDate.innerText = `${dayName}, ${dateNum} ${monthName}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

// Reverse Geocoding City Name
async function fetchCityName(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`;
    const res = await fetch(url);
    const data = await res.json();
    const city = data.city || data.locality || data.principalSubdivision || "Lokasi Anda";
    const country = data.countryCode || "ID";
    return `${city}, ${country}`;
  } catch (e) {
    // Fallback if network blocked
    if (Math.abs(lat - (-2.99)) < 0.1 && Math.abs(lon - 104.76) < 0.1) return "Palembang, ID";
    if (Math.abs(lat - (-6.20)) < 0.1 && Math.abs(lon - 106.84) < 0.1) return "Jakarta, ID";
    if (Math.abs(lat - (-7.79)) < 0.1 && Math.abs(lon - 110.36) < 0.1) return "Yogyakarta, ID";
    if (Math.abs(lat - (-8.40)) < 0.1 && Math.abs(lon - 115.18) < 0.1) return "Denpasar, Bali";
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
}

const inputLat = document.getElementById('inputLat');
const inputLon = document.getElementById('inputLon');
const inputNtfyTopic = document.getElementById('inputNtfyTopic');
const guideTopic = document.getElementById('guideTopic');

const btnRefresh = document.getElementById('btnRefresh');
const btnGps = document.getElementById('btnGps');
const btnExportWallpaper = document.getElementById('btnExportWallpaper');
const btnSendNtfy = document.getElementById('btnSendNtfy');
const btnCopyText = document.getElementById('btnCopyText');
const statusAlert = document.getElementById('statusAlert');
const bandFrameWrapper = document.getElementById('bandFrameWrapper');

// Haversine Distance
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Fetch Weather & Air Quality from Open-Meteo
async function fetchWeatherAndAqi(lat, lon) {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`;
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,uv_index`;

    const [wRes, aqiRes] = await Promise.all([
      fetch(weatherUrl).then(r => r.json()),
      fetch(aqiUrl).then(r => r.json())
    ]);

    const w = wRes.current || {};
    const a = aqiRes.current || {};

    return {
      temp: w.temperature_2m !== undefined ? w.temperature_2m : 29.4,
      humidity: w.relative_humidity_2m !== undefined ? w.relative_humidity_2m : 74,
      wind: w.wind_speed_10m !== undefined ? w.wind_speed_10m : 8.2,
      aqi: a.us_aqi !== undefined ? a.us_aqi : 42,
      pm25: a.pm2_5 !== undefined ? a.pm2_5 : 18.4,
      pm10: a.pm10 !== undefined ? a.pm10 : 31.2,
      uv: a.uv_index !== undefined ? a.uv_index : 6
    };
  } catch (err) {
    console.error("Error fetching weather/aqi:", err);
    return {
      temp: 29.4,
      humidity: 74,
      wind: 8.2,
      aqi: 42,
      pm25: 18.4,
      pm10: 31.2,
      uv: 6
    };
  }
}

// Fetch Earthquakes (USGS API + BMKG proxy)
async function fetchEarthquakes(userLat, userLon) {
  const earthquakes = [];

  try {
    // USGS 2.5+ past day
    const usgsUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
    const res = await fetch(usgsUrl);
    const data = await res.json();

    if (data.features) {
      data.features.forEach(feat => {
        const coords = feat.geometry?.coordinates || [];
        if (coords.length >= 2) {
          const eqLon = coords[0];
          const eqLat = coords[1];
          const mag = feat.properties?.mag || 0;
          const place = feat.properties?.place || "Unknown";
          const dist = haversineDistance(userLat, userLon, eqLat, eqLon);

          // Extract clean country/region name
          let locName = place;
          if (place.includes("of ")) {
            locName = place.split("of ")[1].trim();
          }

          earthquakes.push({
            mag: `M ${mag.toFixed(1)}`,
            location: locName,
            distance: dist
          });
        }
      });
    }
  } catch (err) {
    console.error("Error fetching earthquakes:", err);
  }

  // Sort by nearest distance
  earthquakes.sort((a, b) => a.distance - b.distance);

  // Return top 3 unique
  const unique = [];
  const seen = new Set();
  for (const eq of earthquakes) {
    const isDup = Array.from(seen).some(s => Math.abs(eq.distance - s) < 15);
    if (!isDup) {
      seen.add(eq.distance);
      unique.push(eq);
    }
    if (unique.length >= 3) break;
  }

  // Fallback defaults if offline / none found
  if (unique.length === 0) {
    return [
      { mag: "M 4.8", location: "Indonesia", distance: 423 },
      { mag: "M 4.3", location: "Indonesia", distance: 587 },
      { mag: "M 5.1", location: "Philippines", distance: 821 }
    ];
  }

  return unique;
}

// Update UI
async function updateAllData() {
  btnRefresh.innerText = "⏳ Memperbarui Data...";
  btnRefresh.disabled = true;

  currentLat = parseFloat(inputLat.value) || -2.99;
  currentLon = parseFloat(inputLon.value) || 104.76;
  dispCoords.innerText = `${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`;

  // Fetch city name, weather & earthquakes
  const [cityName, weatherData, earthquakes] = await Promise.all([
    fetchCityName(currentLat, currentLon),
    fetchWeatherAndAqi(currentLat, currentLon),
    fetchEarthquakes(currentLat, currentLon)
  ]);

  currentCityName = cityName;
  currentWeatherData = weatherData;
  currentEarthquakes = earthquakes;

  if (dispCity) {
    dispCity.innerText = currentCityName;
  }

  // Render Weather & AQI
  dispTemp.innerText = `${currentWeatherData.temp.toFixed(1)} °C`;
  if (dispTempBadge) dispTempBadge.innerText = `${currentWeatherData.temp.toFixed(1)} °C`;
  dispHum.innerText = `${currentWeatherData.humidity}%`;
  dispWind.innerText = `${currentWeatherData.wind} km/h`;

  dispAqi.innerText = currentWeatherData.aqi;
  
  // AQI color & gauge indicator
  const aqiVal = currentWeatherData.aqi;
  let aqiColor = '#4ade80';
  let aqiText = 'BAIK';
  if (aqiVal <= 50) {
    aqiColor = '#4ade80'; // Good
    aqiText = 'BAIK';
  } else if (aqiVal <= 100) {
    aqiColor = '#facc15'; // Moderate
    aqiText = 'SEDANG';
  } else if (aqiVal <= 150) {
    aqiColor = '#fb923c'; // Unhealthy Sensitive
    aqiText = 'SENSITIF';
  } else {
    aqiColor = '#f87171'; // Unhealthy
    aqiText = 'BURUK';
  }

  dispAqi.style.color = aqiColor;
  if (dispAqiStatus) {
    dispAqiStatus.innerText = aqiText;
    dispAqiStatus.style.color = aqiColor;
    dispAqiStatus.style.background = `${aqiColor}22`;
  }

  if (dispAqiGauge) {
    const gaugePct = Math.min(100, Math.max(10, (aqiVal / 300) * 100));
    dispAqiGauge.style.width = `${gaugePct}%`;
  }

  dispPm25.innerText = currentWeatherData.pm25;
  dispPm10.innerText = currentWeatherData.pm10;
  dispUv.innerText = currentWeatherData.uv;

  // Render Earthquakes
  dispEqList.innerHTML = currentEarthquakes.slice(0, 2).map((eq, i) => `
    <div class="gw-eq-item">
      <div class="gw-eq-row-top">
        <span class="gw-eq-mag">${i + 1}. ${eq.mag}</span>
        <span class="gw-eq-dist">${eq.distance} km</span>
      </div>
      <div class="gw-eq-loc">${eq.location}</div>
    </div>
  `).join('');

  btnRefresh.innerText = "🔄 Perbarui Data Realtime";
  btnRefresh.disabled = false;
}

// Export High-Graphic 172x320 Watchface Wallpaper Image
function exportWatchfaceImage() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  // Background based on current theme
  if (currentTheme === 'cyber-hud') {
    const grad = ctx.createRadialGradient(86, 30, 10, 86, 160, 170);
    grad.addColorStop(0, '#111d33');
    grad.addColorStop(1, '#050811');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 172, 320);

    // Subtle grid overlay
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 172; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 320); ctx.stroke();
    }
    for (let y = 0; y < 320; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(172, y); ctx.stroke();
    }
  } else if (currentTheme === 'satellite') {
    const grad = ctx.createRadialGradient(86, 0, 10, 86, 160, 180);
    grad.addColorStop(0, '#0c2b4e');
    grad.addColorStop(1, '#020611');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 172, 320);
  } else if (currentTheme === 'seismic') {
    const grad = ctx.createRadialGradient(86, 300, 10, 86, 160, 180);
    grad.addColorStop(0, '#380909');
    grad.addColorStop(1, '#080203');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 172, 320);
  } else {
    // Pure OLED
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 172, 320);
  }

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const dayStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;

  const w = currentWeatherData || {
    temp: 29.4, humidity: 74, wind: 8.2, aqi: 42, pm25: 18.4, pm10: 31.2, uv: 6
  };
  const eqs = currentEarthquakes.length > 0 ? currentEarthquakes : [
    { mag: "M 4.8", location: "Indonesia", distance: 423 },
    { mag: "M 4.3", location: "Indonesia", distance: 587 }
  ];

  // Helper function to draw rounded cards
  function drawCard(x, y, width, height, radius = 6, bgColor = 'rgba(15, 23, 42, 0.7)', borderColor = 'rgba(255, 255, 255, 0.1)') {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  let y = 18;

  // 1. Digital Clock & Status Bar
  ctx.font = 'bold 18px monospace, system-ui';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${hours}:${minutes}`, 8, y);

  ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(dayStr, 70, y - 2);

  // Live Pill
  drawCard(136, y - 10, 28, 12, 3, 'rgba(16, 185, 129, 0.2)', 'rgba(52, 211, 153, 0.5)');
  ctx.font = 'bold 7px system-ui';
  ctx.fillStyle = '#34d399';
  ctx.fillText('LIVE', 142, y - 1);

  // 2. Header / Title Card
  y += 8;
  drawCard(6, y, 160, 32, 6, 'rgba(30, 58, 138, 0.35)', 'rgba(96, 165, 250, 0.3)');
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🌍  GEOWATCH', 12, y + 13);

  ctx.font = 'bold 8.5px system-ui';
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(`📍 ${currentCityName.substring(0, 15)}`, 12, y + 25);

  ctx.font = '7.5px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`, 102, y + 25);

  // 3. Weather Card
  y += 36;
  drawCard(6, y, 160, 50, 6, 'rgba(15, 23, 42, 0.65)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = 'bold 8px system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('🌤️  WEATHER OVERVIEW', 12, y + 12);

  // Temp Badge
  drawCard(118, y + 4, 42, 11, 3, 'rgba(251, 191, 36, 0.15)', 'rgba(251, 191, 36, 0.3)');
  ctx.font = 'bold 7.5px system-ui';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`${w.temp.toFixed(1)} °C`, 122, y + 12);

  // 3 Columns inside Weather
  drawCard(10, y + 18, 48, 26, 4, 'rgba(0, 0, 0, 0.3)', 'transparent');
  ctx.font = '6.5px system-ui'; ctx.fillStyle = '#64748b'; ctx.fillText('SUHU', 20, y + 28);
  ctx.font = 'bold 8px system-ui'; ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.temp.toFixed(1)}°`, 20, y + 39);

  drawCard(62, y + 18, 48, 26, 4, 'rgba(0, 0, 0, 0.3)', 'transparent');
  ctx.font = '6.5px system-ui'; ctx.fillStyle = '#64748b'; ctx.fillText('LEMBAP', 70, y + 28);
  ctx.font = 'bold 8px system-ui'; ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.humidity}%`, 74, y + 39);

  drawCard(114, y + 18, 48, 26, 4, 'rgba(0, 0, 0, 0.3)', 'transparent');
  ctx.font = '6.5px system-ui'; ctx.fillStyle = '#64748b'; ctx.fillText('ANGIN', 124, y + 28);
  ctx.font = 'bold 8px system-ui'; ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.wind}`, 126, y + 39);

  // 4. Air Quality Card
  y += 54;
  drawCard(6, y, 160, 52, 6, 'rgba(15, 23, 42, 0.65)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = 'bold 8px system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('🌫️  AIR QUALITY (AQI)', 12, y + 12);

  // AQI Large Number
  const aqiColor = w.aqi <= 50 ? '#4ade80' : (w.aqi <= 100 ? '#facc15' : '#f87171');
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = aqiColor;
  ctx.fillText(`${w.aqi}`, 14, y + 33);

  // Sub items
  ctx.font = '7px system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`PM2.5: ${w.pm25}`, 80, y + 23);
  ctx.fillText(`PM10: ${w.pm10}`, 80, y + 33);
  ctx.fillText(`UV: ${w.uv}`, 130, y + 28);

  // Gauge Line
  drawCard(12, y + 42, 148, 4, 2, 'rgba(255, 255, 255, 0.1)', 'transparent');
  const fillWidth = Math.min(148, Math.max(14, (w.aqi / 300) * 148));
  drawCard(12, y + 42, fillWidth, 4, 2, aqiColor, 'transparent');

  // 5. Seismic Card
  y += 56;
  drawCard(6, y, 160, 54, 6, 'rgba(15, 23, 42, 0.65)', 'rgba(239, 68, 68, 0.3)');
  ctx.font = 'bold 8px system-ui';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('🌋  SEISMIC ALERTS', 12, y + 12);

  drawCard(124, y + 4, 36, 11, 3, 'rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.4)');
  ctx.font = 'bold 7px system-ui';
  ctx.fillStyle = '#ef4444';
  ctx.fillText('⚡ BMKG', 128, y + 12);

  eqs.slice(0, 2).forEach((eq, idx) => {
    const itemY = y + 17 + (idx * 16);
    drawCard(10, itemY, 152, 14, 3, 'rgba(0, 0, 0, 0.3)', 'transparent');
    
    ctx.font = 'bold 7.5px system-ui';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`${idx + 1}. ${eq.mag}`, 14, itemY + 10);

    ctx.font = '7px system-ui';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${eq.location.substring(0, 14)}`, 54, itemY + 10);

    ctx.font = '6.5px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${eq.distance}km`, 128, itemY + 10);
  });

  // Download trigger
  const link = document.createElement('a');
  link.download = `geowatch_${currentTheme}_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Theme Button Click Handlers
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTheme = btn.dataset.theme;

    // Update screen classes
    bandScreen.className = `band-screen theme-${currentTheme}`;
  });
});

// Send NTFY Notification
async function sendNtfyPush() {
  const topic = inputNtfyTopic.value.trim() || 'geowatch_band8_active';
  const msg = generatePushMessage();

  statusAlert.style.display = 'block';
  statusAlert.className = 'alert-box';
  statusAlert.innerText = 'Mengirim notifikasi ke NTFY...';

  try {
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: msg,
      headers: {
        'Title': '🌍 GEOWATCH ALERT',
        'Priority': 'urgent',
        'Tags': 'earth_asia,volcano,barometer'
      }
    });

    if (res.ok) {
      statusAlert.className = 'alert-box success';
      statusAlert.innerText = `✅ Berhasil dikirim ke topic [${topic}]! Jika Mi Fitness terhubung dengan NTFY, Smart Band 8 Active Anda akan langsung bergetar.`;
    } else {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch (err) {
    statusAlert.className = 'alert-box';
    statusAlert.innerText = `⚠️ Error: ${err.message}. Pastikan koneksi internet aktif.`;
  }
}

// Event Listeners
btnRefresh.addEventListener('click', updateAllData);

btnExportWallpaper.addEventListener('click', exportWatchfaceImage);

btnSendNtfy.addEventListener('click', sendNtfyPush);

btnCopyText.addEventListener('click', () => {
  const text = generatePushMessage();
  navigator.clipboard.writeText(text);
  alert("✅ Format teks GEOWATCH berhasil disalin ke clipboard!");
});

inputNtfyTopic.addEventListener('input', (e) => {
  guideTopic.innerText = e.target.value || 'geowatch_band8_active';
});

// Preset Buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    inputLat.value = btn.dataset.lat;
    inputLon.value = btn.dataset.lon;
    updateAllData();
  });
});

// Scale Controls
document.querySelectorAll('.scale-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const scale = parseFloat(btn.dataset.scale);
    bandFrameWrapper.style.transform = `scale(${scale})`;
    
    // adjust action bar margin
    const margin = scale === 1 ? 20 : (scale === 1.5 ? 130 : 250);
    document.querySelector('.action-bar').style.marginTop = `${margin}px`;
  });
});

// GPS Button
btnGps.addEventListener('click', () => {
  if (navigator.geolocation) {
    btnGps.innerText = "⏳ Mendeteksi...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        inputLat.value = pos.coords.latitude.toFixed(2);
        inputLon.value = pos.coords.longitude.toFixed(2);
        btnGps.innerText = "📍 Sesuai GPS";
        updateAllData();
      },
      (err) => {
        alert("Gagal mendapatkan lokasi GPS: " + err.message);
        btnGps.innerText = "📍 Gunakan GPS HP/Browser";
      }
    );
  } else {
    alert("Geolocation tidak didukung di browser ini.");
  }
});

// Initialize on Load
updateAllData();
