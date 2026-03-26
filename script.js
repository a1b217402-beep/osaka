function openModal(dayId) {
    const modal = document.getElementById('itineraryModal');
    const modalBody = document.getElementById('modalBody');
    const sourceContent = document.getElementById('content-' + dayId);
    
    if (modal && sourceContent) {
        modalBody.innerHTML = sourceContent.innerHTML;
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('open');
        }, 15);
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('itineraryModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => {
            if (!modal.classList.contains('open')) {
                modal.style.display = 'none';
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

// 新增：抓取大阪市即時天氣 (使用免費的 Open-Meteo API)
async function fetchWeather() {
    const weatherInfo = document.getElementById('weather-info');
    if (!weatherInfo) return;

    try {
        // 大阪市經緯度 (緯度 34.6937, 經度 135.5022)
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=34.6937&longitude=135.5022&current_weather=true&timezone=Asia%2FTokyo');
        const data = await response.json();
        
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        
        // 簡易天氣狀態判斷
        let desc = "晴天";
        let icon = "☀️";
        if (code === 1 || code === 2 || code === 3) { desc = "多雲"; icon = "⛅"; }
        else if (code >= 45 && code <= 48) { desc = "有霧"; icon = "🌫️"; }
        else if (code >= 51 && code <= 67) { desc = "下雨"; icon = "🌧️"; }
        else if (code >= 71 && code <= 82) { desc = "下雪"; icon = "❄️"; }
        else if (code >= 95) { desc = "雷陣雨"; icon = "⛈️"; }

        weatherInfo.innerHTML = `<span style="font-size:18px;">${icon}</span> 大阪市：${temp}°C | ${desc}`;
    } catch (error) {
        console.error("天氣資訊抓取失敗", error);
        weatherInfo.innerHTML = "無法取得即時天氣";
    }
}

// 網頁載入完成後自動執行天氣抓取
document.addEventListener('DOMContentLoaded', fetchWeather);
