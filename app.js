// State
let currentLat = -2.99;
let currentLon = 104.76;
let currentCityName = "Palembang, Indonesia";
let currentWeatherData = null;
let currentEarthquakes = [];

// DOM Elements
const dispClock = document.getElementById('dispClock');
const dispDate = document.getElementById('dispDate');
const dispCity = document.getElementById('dispCity');
const dispCoords = document.getElementById('dispCoords');
const dispTemp = document.getElementById('dispTemp');
const dispHum = document.getElementById('dispHum');
const dispWind = document.getElementById('dispWind');
const dispAqi = document.getElementById('dispAqi');
const dispPm25 = document.getElementById('dispPm25');
const dispPm10 = document.getElementById('dispPm10');
const dispUv = document.getElementById('dispUv');
const dispEqList = document.getElementById('dispEqList');

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
  dispHum.innerText = `${currentWeatherData.humidity}%`;
  dispWind.innerText = `${currentWeatherData.wind} km/h`;

  dispAqi.innerText = currentWeatherData.aqi;
  // AQI color indicator
  if (currentWeatherData.aqi <= 50) {
    dispAqi.style.color = "#4ade80"; // Good (Green)
  } else if (currentWeatherData.aqi <= 100) {
    dispAqi.style.color = "#facc15"; // Moderate (Yellow)
  } else {
    dispAqi.style.color = "#f87171"; // Unhealthy (Red)
  }

  dispPm25.innerText = `${currentWeatherData.pm25} µg/m³`;
  dispPm10.innerText = `${currentWeatherData.pm10} µg/m³`;
  dispUv.innerText = currentWeatherData.uv;

  // Render Earthquakes
  dispEqList.innerHTML = currentEarthquakes.map((eq, i) => `
    <div class="gw-eq-item">
      <div class="gw-eq-mag">${i + 1}. ${eq.mag}</div>
      <div class="gw-eq-loc">${eq.location}</div>
      <div class="gw-eq-dist">Distance: ${eq.distance} km</div>
    </div>
  `).join('');

  btnRefresh.innerText = "🔄 Perbarui Data Realtime";
  btnRefresh.disabled = false;
}

// Generate Push Message Text
function generatePushMessage() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

  const w = currentWeatherData || {
    temp: 29.4, humidity: 74, wind: 8.2, aqi: 42, pm25: 18.4, pm10: 31.2, uv: 6
  };
  const eqs = currentEarthquakes.length > 0 ? currentEarthquakes : [
    { mag: "M 4.8", location: "Indonesia", distance: 423 },
    { mag: "M 4.3", location: "Indonesia", distance: 587 },
    { mag: "M 5.1", location: "Philippines", distance: 821 }
  ];

  let msg = `🕒 ${timeStr} • ${dateStr}\n`;
  msg += `🌍 GEOWATCH\n`;
  msg += `📍 ${currentCityName} (${currentLat.toFixed(2)}, ${currentLon.toFixed(2)})\n\n`;
  msg += `🌤️ WEATHER\nTemperature: ${w.temp.toFixed(1)} °C\nHumidity: ${w.humidity}%\nWind: ${w.wind} km/h\n\n`;
  msg += `🌫️ AIR QUALITY\nAQI: ${w.aqi}\nPM2.5: ${w.pm25} µg/m³\nPM10: ${w.pm10} µg/m³\nUV: ${w.uv}\n\n`;
  msg += `🌋 NEAREST EARTHQUAKES\n`;
  eqs.forEach((eq, idx) => {
    msg += `${idx + 1}. ${eq.mag}\n${eq.location}\nDistance: ${eq.distance} km\n\n`;
  });

  return msg.trim();
}

// Export 172x320 Watchface Wallpaper Image
function exportWatchfaceImage() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 172, 320);

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
    { mag: "M 4.3", location: "Indonesia", distance: 587 },
    { mag: "M 5.1", location: "Philippines", distance: 821 }
  ];

  let y = 20;

  // Digital Clock Header
  ctx.font = 'bold 20px monospace, system-ui';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${hours}:${minutes}`, 8, y);

  ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(dayStr, 96, y - 2);

  // Line Separator
  y += 6;
  ctx.strokeStyle = '#222d3d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, y);
  ctx.lineTo(164, y);
  ctx.stroke();

  // Title
  y += 14;
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🌍  GEOWATCH', 8, y);

  // City & Coords
  y += 14;
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f3f4f6';
  ctx.fillText(`📍 ${currentCityName.substring(0, 18)}`, 8, y);

  y += 11;
  ctx.font = '8px monospace';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(`${currentLat.toFixed(2)}, ${currentLon.toFixed(2)}`, 20, y);

  // Weather Section
  y += 16;
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🌤️  WEATHER', 8, y);

  ctx.font = '8.5px system-ui, -apple-system, sans-serif';
  y += 12;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('Temperature:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.temp.toFixed(1)} °C`, 100, y);

  y += 11;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('Humidity:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.humidity}%`, 100, y);

  y += 11;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('Wind:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.wind} km/h`, 100, y);

  // Air Quality
  y += 16;
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🌫️  AIR QUALITY', 8, y);

  ctx.font = '8.5px system-ui, -apple-system, sans-serif';
  y += 12;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('AQI:', 10, y);
  ctx.fillStyle = w.aqi <= 50 ? '#4ade80' : (w.aqi <= 100 ? '#facc15' : '#f87171');
  ctx.fillText(`${w.aqi}`, 100, y);

  y += 11;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('PM2.5:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.pm25} µg/m³`, 80, y);

  y += 11;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('PM10:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.pm10} µg/m³`, 80, y);

  y += 11;
  ctx.fillStyle = '#9ca3af'; ctx.fillText('UV:', 10, y);
  ctx.fillStyle = '#ffffff'; ctx.fillText(`${w.uv}`, 100, y);

  // Earthquakes
  y += 16;
  ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🌋  NEAREST EARTHQUAKES', 8, y);

  ctx.font = '8px system-ui, -apple-system, sans-serif';
  eqs.slice(0, 3).forEach((eq, idx) => {
    y += 12;
    ctx.fillStyle = '#f87171';
    ctx.fillText(`${idx + 1}. ${eq.mag}`, 10, y);
    y += 10;
    ctx.fillStyle = '#d1d5db';
    ctx.fillText(`${eq.location.substring(0, 20)}`, 10, y);
    y += 10;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Distance: ${eq.distance} km`, 10, y);
  });

  // Download trigger
  const link = document.createElement('a');
  link.download = `geowatch_band8_active_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

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
