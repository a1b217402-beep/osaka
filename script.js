let currentActiveButton = null;

// 精準計算縮放原點
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
    const modalContent = document.querySelector('.modal-content');
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

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeModal();
});

function getWeatherEmoji(code) {
    if (code === 0) return "☀️";
    if (code === 1 || code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 82) return "❄️";
    if (code >= 95) return "⛈️";
    return "🌤️";
}

// 核心：優化後的天氣與時間同步函數
async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    
    try {
        // 1. 立即更新城市名稱，給予使用者反饋
        locationName.innerHTML = `📍 ${cityName}`;

        // 2. 抓取天氣資料 (使用 timezone=auto 確保時間軸與定位點一致)
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=2`);
        const data = await response.json();
        
        const currentCode = data.current_weather.weathercode;
        const currentTemp = Math.round(data.current_weather.temperature);
        titleDesc.innerHTML = `${getWeatherEmoji(currentCode)} 目前 ${currentTemp}°C`;

        // 3. 根據當地現在時間對齊 24 小時預報
        const currentHourStr = data.current_weather.time; 
        const hourlyTimes = data.hourly.time;
        let startIndex = hourlyTimes.findIndex(t => t === currentHourStr);
        if (startIndex === -1) startIndex = 0; 

        let hourlyHTML = '';
        for (let i = startIndex; i < startIndex + 24; i++) {
            const timeStr = hourlyTimes[i].substring(11, 16); 
            const temp = Math.round(data.hourly.temperature_2m[i]);
            const icon = getWeatherEmoji(data.hourly.weathercode[i]);
            
            hourlyHTML += `
                <div class="hourly-item">
                    <span class="h-time">${timeStr}</span>
                    <span class="h-icon">${icon}</span>
                    <span class="h-temp">${temp}°</span>
                </div>
            `;
        }
        // 4. 最後一次灌入所有 HTML，減少閃爍
        hourlyContainer.innerHTML = hourlyHTML;

    } catch (error) {
        console.error("天氣獲取失敗", error);
        titleDesc.innerHTML = "天氣同步失敗";
    }
}

// 加速版：優先處理定位，再進行氣象調度
function initWeather() {
    if ("geolocation" in navigator) {
        // 設定較短的啟動延遲，搶先在頁面完全渲染前發起請求
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // 異步平行處理：一邊定位城市名，一邊準備抓天氣
                try {
                    const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                    const geoData = await geoRes.json();
                    const cityName = geoData.city || geoData.locality || "當地位置";
                    fetchWeather(lat, lon, cityName);
                } catch (e) {
                    fetchWeather(lat, lon, "目前位置");
                }
            }, 
            (error) => {
                // 拒絕定位則直接載入大阪 (預設值)
                fetchWeather(34.6937, 135.5022, "大阪市 (預設)");
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    } else {
        fetchWeather(34.6937, 135.5022, "大阪市 (預設)");
    }
}

// 監聽 DOMContentLoaded 確保在 HTML 結構出來後第一時間執行
document.addEventListener('DOMContentLoaded', initWeather);
