let currentActiveButton = null;

// --- 原有的視窗控制邏輯 ---
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

// --- 行程預覽動態更新邏輯 ---
function updateItineraryPreview() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const currentTimeScore = hours * 60 + mins;

    let dayDataId = "";
    
    // 判斷今天是旅遊第幾天 (8/10~8/17)
    if (month === 8) {
        if (date >= 10 && date <= 17) {
            dayDataId = `content-day${date - 9}`;
        }
    }

    // 如果不在旅遊期間，為了測試，預設抓 Day 1
    if (!dayDataId) dayDataId = "content-day1";

    const daySection = document.getElementById(dayDataId);
    if (!daySection) return;

    const items = Array.from(daySection.querySelectorAll('.time-item'));
    const itinerary = items.map(el => {
        const timeStr = el.getAttribute('data-time') || "00:00";
        const [h, m] = timeStr.split(':').map(Number);
        return {
            time: timeStr,
            score: h * 60 + m,
            title: el.querySelector('span:last-child').innerText
        };
    });

    let currentIdx = -1;
    
    // 尋找當前行程：時間最接近且已超過開始時間的
    for (let i = 0; i < itinerary.length; i++) {
        if (currentTimeScore >= itinerary[i].score) {
            currentIdx = i;
        }
    }

    // 如果還沒到今天第一個行程，顯示第一個
    if (currentIdx === -1) currentIdx = 0;

    const currentItem = itinerary[currentIdx];
    const nextItem = itinerary[currentIdx + 1] || { time: "--:--", title: "本日行程結束" };

    // 更新介面
    document.getElementById('preview-now-time').innerText = currentItem.time;
    document.getElementById('preview-now-title').innerText = currentItem.title;
    document.getElementById('preview-next-title').innerText = nextItem.title;
    document.getElementById('preview-next-time').innerText = nextItem.time;
}

// --- 天氣邏輯 ---
function getWeatherEmoji(code) {
    const table = { 0: "☀️", 1: "⛅", 2: "⛅", 3: "☁️", 45: "🌫️", 51: "🌧️", 61: "🌧️", 95: "⛈️" };
    return table[code] || "🌤️";
}

async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    try {
        locationName.innerHTML = `📍 ${cityName}`;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=2`);
        const data = await res.json();
        const currentHourStr = data.current_weather.time; 
        titleDesc.innerHTML = `${getWeatherEmoji(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;

        let startIndex = data.hourly.time.findIndex(t => t === currentHourStr);
        if (startIndex === -1) startIndex = 0;

        let html = '';
        for (let i = startIndex; i < startIndex + 24; i++) {
            if (!data.hourly.time[i]) break;
            const label = (i === startIndex) ? "現在" : data.hourly.time[i].substring(11, 16);
            html += `<div class="hourly-item">
                <span class="h-time serif">${label}</span>
                <span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span>
                <span class="h-temp serif">${Math.round(data.hourly.temperature_2m[i])}°</span>
            </div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) { titleDesc.innerHTML = "同步失敗"; }
}

function init() {
    // 啟動天氣
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            try {
                const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                const gData = await geo.json();
                fetchWeather(lat, lon, gData.city || "目前位置");
            } catch { fetchWeather(lat, lon, "目前位置"); }
        }, () => fetchWeather(34.69, 135.50, "大阪市 (預設)"));
    } else { fetchWeather(34.69, 135.50, "大阪市 (預設)"); }

    // 啟動行程預覽更新
    updateItineraryPreview();
    setInterval(updateItineraryPreview, 60000); // 每分鐘更新一次
}

document.addEventListener('DOMContentLoaded', init);
