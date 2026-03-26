let currentActiveButton = null;

// 精準計算吸附特效的原點
function setModalOrigin() {
    if (!currentActiveButton) return;
    const modalContent = document.querySelector('.modal-content');
    const btnRect = currentActiveButton.getBoundingClientRect();
    const layoutLeft = (window.innerWidth - modalContent.offsetWidth) / 2;
    const layoutTop = (window.innerHeight - modalContent.offsetHeight) / 2;
    const originX = btnRect.left + (btnRect.width / 2) - layoutLeft;
    const originY = btnRect.top + (btnRect.height / 2) - layoutTop;
    modalContent.style.transformOrigin = `${originX}px ${originY}px`;
}

function openModal(dayId, event) {
    const modal = document.getElementById('itineraryModal');
    const modalBody = document.getElementById('modalBody');
    const sourceContent = document.getElementById('content-' + dayId);
    if (modal && sourceContent && event) {
        currentActiveButton = event.currentTarget;
        modalBody.innerHTML = sourceContent.innerHTML;
        modal.style.display = 'flex';
        setModalOrigin();
        void modal.offsetWidth; 
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('itineraryModal');
    if (modal) {
        setModalOrigin();
        modal.classList.remove('open');
        setTimeout(() => {
            if (!modal.classList.contains('open')) {
                modal.style.display = 'none';
                currentActiveButton = null;
            }
        }, 400); 
        document.body.style.overflow = '';
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('itineraryModal');
    if (event.target === modal) closeModal();
};

function getWeatherEmoji(code) {
    const table = { 0: "☀️", 1: "⛅", 2: "⛅", 3: "☁️", 45: "🌫️", 51: "🌧️", 61: "🌧️", 95: "⛈️" };
    return table[code] || "🌤️";
}

// 抓取 24H 天氣，精準對齊現在這一個小時
async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    try {
        locationName.innerHTML = `📍 ${cityName}`;
        // 使用 timezone=auto 確保 API 返回的是當地正確時間字串
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=2`);
        const data = await res.json();
        
        // 取得 API 定義的目前時間字串 (例如 "2026-03-26T17:00")
        const currentHourStr = data.current_weather.time; 
        const hourlyTimes = data.hourly.time;
        
        // 更新當前天氣標題
        titleDesc.innerHTML = `${getWeatherEmoji(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;

        // 尋找與現在小時對應的陣列索引
        let startIndex = hourlyTimes.findIndex(t => t === currentHourStr);
        if (startIndex === -1) startIndex = 0;

        let html = '';
        // 從現在開始往後抓 24 小時
        for (let i = startIndex; i < startIndex + 24; i++) {
            if (!hourlyTimes[i]) break;
            // 第一格顯示「現在」
            const timeLabel = (i === startIndex) ? "現在" : hourlyTimes[i].substring(11, 16);
            html += `
                <div class="hourly-item">
                    <span class="h-time serif">${timeLabel}</span>
                    <span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span>
                    <span class="h-temp serif">${Math.round(data.hourly.temperature_2m[i])}°</span>
                </div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) { titleDesc.innerHTML = "同步失敗"; }
}

function initWeather() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            try {
                const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                const gData = await geo.json();
                fetchWeather(lat, lon, gData.city || gData.locality || "當地位置");
            } catch { fetchWeather(lat, lon, "目前位置"); }
        }, () => fetchWeather(34.69, 135.50, "大阪市 (預設)"), { timeout: 8000 });
    } else { fetchWeather(34.69, 135.50, "大阪市 (預設)"); }
}

document.addEventListener('DOMContentLoaded', initWeather);
