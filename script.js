// 動態獲取按鈕位置，創造精準的吸附與彈跳特效
function openModal(dayId, event) {
    const modal = document.getElementById('itineraryModal');
    const modalContent = document.querySelector('.modal-content');
    const modalBody = document.getElementById('modalBody');
    const sourceContent = document.getElementById('content-' + dayId);
    
    if (modal && sourceContent && event) {
        modalBody.innerHTML = sourceContent.innerHTML;
        modal.style.display = 'flex';
        
        const btnRect = event.currentTarget.getBoundingClientRect();
        const contentRect = modalContent.getBoundingClientRect();
        const originX = btnRect.left + (btnRect.width / 2) - contentRect.left;
        const originY = btnRect.top + (btnRect.height / 2) - contentRect.top;
        
        modalContent.style.transformOrigin = `${originX}px ${originY}px`;
        void modal.offsetWidth; 
        
        modal.classList.add('open');
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

// 根據傳入的座標與城市名稱抓取天氣
async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    
    if (!hourlyContainer) return;
