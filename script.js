let currentActiveButton = null;

// 計算彈出視窗相對於點擊按鈕的 X/Y 原點
function setModalOrigin() {
    if (!currentActiveButton) return;
    const modalContent = document.querySelector('.modal-content');
    const btnRect = currentActiveButton.getBoundingClientRect();
    
    // 計算卡片置中時的偏移量
    const layoutLeft = (window.innerWidth - modalContent.offsetWidth) / 2;
    const layoutTop = (window.innerHeight - modalContent.offsetHeight) / 2;
    
    const originX = btnRect.left + (btnRect.width / 2) - layoutLeft;
    const originY = btnRect.top + (btnRect.height / 2) - layoutTop;
    
    modalContent.style.transformOrigin = `${originX}px ${originY}px`;
}

function openModal(dayId, event) {
    const modal = document.getElementById('itineraryModal');
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.getElementById('modalBody');
    const sourceContent = document.getElementById('content-' + dayId);
    
    if (modal && sourceContent && event) {
        currentActiveButton = event.currentTarget; // 記憶點擊的按鈕
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
        setModalOrigin(); // 縮回前再次定位，確保吸附感
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

// 點擊背景關閉
window.onclick = function(event) {
    const modal = document.getElementById('itineraryModal');
    if (event.target === modal) closeModal();
};

// 天氣圖示轉換
function getWeatherEmoji(code) {
    const table = { 0: "☀️", 1: "⛅", 2: "⛅", 3: "☁️", 45: "🌫️", 51: "🌧️", 61: "🌧️", 95: "⛈️" };
    return table[code] || "🌤️";
}

// 抓取 24H 天氣並與當地時間對齊
async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    
    try {
        locationName.innerHTML = `📍 ${cityName}`;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=2`);
        const data = await res.json();
        
        titleDesc.innerHTML = `${getWeatherEmoji(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;

        const currentHourStr = data.current_weather.time; // 例如 "2026-03-26T17:00"
        const hourlyTimes = data.hourly.time;
        
        // 尋找與現在時間字串完全一致的起始索引
        let startIndex = hourlyTimes.findIndex(t => t === currentHourStr);
        if (startIndex === -1) startIndex = 0;

        let html = '';
        for (let i = startIndex; i < startIndex + 24; i++) {
            if (!hourlyTimes[i]) break;
            html += `
                <div class="hourly-item">
                    <span class="h-time">${hourlyTimes[i].substring(11, 16)}</span>
                    <span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span>
                    <span class="h-temp">${Math.round(data.hourly.temperature_2m[i])}°</span>
                </div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) {
        titleDesc.innerHTML = "同步失敗";
    }
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
    } else {
        fetchWeather(34.69, 135.50, "大阪市 (預設)");
    }
}

document.addEventListener('DOMContentLoaded', initWeather);
