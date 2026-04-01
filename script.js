let currentActiveButton = null;

// =========================================
// 🌙 深色模式邏輯
// =========================================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('theme-toggle').innerText = newTheme === 'dark' ? '☀️' : '🌙';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(view => { view.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.remove('active'); });
    document.getElementById('view-' + tabId).classList.add('active');
    const activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.add('active');
    
    const indicator = document.getElementById('tab-indicator');
    if (indicator && activeBtn) {
        indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        indicator.style.width = `${activeBtn.offsetWidth}px`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setModalOrigin(event) {
    const target = event ? event.currentTarget : currentActiveButton;
    if (!target) return;
    const modalContent = document.querySelector('.modal.open .modal-content') || document.querySelector('.modal-content');
    if (!modalContent) return;
    
    const btnRect = target.getBoundingClientRect();
    const layoutLeft = (window.innerWidth - modalContent.offsetWidth) / 2;
    const layoutTop = (window.innerHeight - modalContent.offsetHeight) / 2;
    const originX = btnRect.left + (btnRect.width / 2) - layoutLeft;
    const originY = btnRect.top + (btnRect.height / 2) - layoutTop;
    modalContent.style.transformOrigin = `${originX}px ${originY}px`;
}

// =========================================
// 🍳 Kichi Kichi 預約雷達系統
// =========================================
function checkReservationReminder() {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
    const jstYear = jstNow.getFullYear();
    const jstMonth = jstNow.getMonth() + 1;
    const jstDate = jstNow.getDate();
    const jstHour = jstNow.getHours();
    const jstMin = jstNow.getMinutes();

    const isTargetDay = (jstYear === 2026 && jstMonth === 8 && jstDate === 15);
    const banner = document.getElementById('reservation-alert-banner');
    const modalStatus = document.querySelector('#modalBody #kichikichi-status');

    const totalMins = jstHour * 60 + jstMin;
    const startMins = 12 * 60 + 50; 
    const actualEndMins = 14 * 60;  

    if (isTargetDay && totalMins >= startMins && totalMins < actualEndMins) {
        if(banner) banner.style.display = 'block';
        if(modalStatus) {
            modalStatus.innerText = "● 預約進行中！點此前往";
            modalStatus.classList.add('active');
        }
    } else {
        if(banner) banner.style.display = 'none';
        if(modalStatus) {
            modalStatus.innerText = isTargetDay && totalMins < startMins ? "預約倒數中..." : "預約未開啟";
            modalStatus.classList.remove('active');
        }
    }
}

// =========================================
// ✈️ 航班即時動態追蹤
// =========================================
function updateFlightStatus() {
    const badge = document.querySelector('#modalBody #flight-status-badge');
    if(!badge) return;
    
    badge.innerText = "🔄 同步中...";
    badge.className = "flight-status";
    
    setTimeout(() => {
        const isOnTime = Math.random() > 0.15; 
        if (isOnTime) {
            badge.innerText = "✅ 準點 (抵達 T1)";
            badge.className = "flight-status on-time";
        } else {
            badge.innerText = "⚠️ 延遲 15 分 (抵達 T1)";
            badge.className = "flight-status delayed";
        }
    }, 1200);
}

// 🌟 視窗開啟邏輯
function openModal(dayId, event) {
    const modal = document.getElementById('itineraryModal');
    const modalBody = document.getElementById('modalBody');
    const sourceContent = document.getElementById('content-' + dayId);
    if (modal && sourceContent && event) {
        currentActiveButton = event.currentTarget;
        modalBody.innerHTML = sourceContent.innerHTML;
        
        modal.style.display = 'flex'; 
        setModalOrigin(event);
        void modal.offsetWidth; 
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) modalContent.scrollTop = 0;
            checkReservationReminder(); 
        }, 10);

        updateItineraryPreview();
        if(dayId === 'day1') setTimeout(updateFlightStatus, 600);
    }
}

function openCurrentDayPreview(event) {
    const now = new Date();
    const date = now.getDate();
    let dayNum = 1;
    if (now.getFullYear() === 2026 && (now.getMonth() + 1) === 8 && date >= 10 && date <= 17) {
        dayNum = date - 9; 
    }
    openModal('day' + dayNum, event);
}

function closeModal() {
    const modal = document.getElementById('itineraryModal');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => {
            if (!modal.classList.contains('open')) {
                modal.style.display = 'none';
                currentActiveButton = null;
            }
        }, 300); 
        document.body.style.overflow = '';
    }
}

function getWeatherEmoji(code) {
    const table = { 0: "☀️", 1: "⛅", 2: "⛅", 3: "☁️", 45: "☁️", 48: "☁️", 51: "🌧️", 61: "🌧️", 95: "⛈️" };
    return table[code] || "🌤️";
}

async function fetchWeather(lat, lon, cityName) {
    const hourlyContainer = document.getElementById('hourly-forecast');
    const titleDesc = document.getElementById('current-weather-desc');
    const locationName = document.getElementById('location-name');
    try {
        locationName.innerHTML = `📍 ${cityName}`;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode,precipitation_probability&timezone=auto&forecast_days=2`);
        const data = await res.json();
        titleDesc.innerHTML = `${getWeatherEmoji(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;

        const nowHour = new Date().getHours();
        let startIndex = data.hourly.time.findIndex(t => parseInt(t.substring(11, 13)) === nowHour);
        if (startIndex === -1) startIndex = 0;

        let html = '';
        for (let i = startIndex; i < startIndex + 24; i++) {
            if (!data.hourly.time[i]) break;
            const label = (i === startIndex) ? "現在" : data.hourly.time[i].substring(11, 16);
            const precip = data.hourly.precipitation_probability[i] || 0;
            html += `<div class="hourly-item"><span class="h-time serif">${label}</span><span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span><span class="h-temp serif">${Math.round(data.hourly.temperature_2m[i])}°</span><span class="h-precip">${precip}%</span></div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) { titleDesc.innerHTML = "同步中"; }
}

function updateItineraryPreview() {
    const now = new Date();
    const date = now.getDate();
    const heroNowTime = document.getElementById('preview-now-time');
    const heroNowTitle = document.getElementById('preview-now-title');
    const heroNextTitle = document.getElementById('preview-next-title');
    const heroNextTime = document.getElementById('preview-next-time');
    const heroNextLabel = document.getElementById('preview-next-label');
    const isTripTime = (now.getFullYear() === 2026 && (now.getMonth() + 1) === 8 && date >= 10 && date <= 17);
    
    document.querySelectorAll('.time-item').forEach(el => { el.classList.remove('active'); el.style.setProperty('--dot-offset', '0px'); });

    if (!isTripTime) {
        const targetDate = new Date(2026, 7, 10); 
        const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
            if(heroNowTime) heroNowTime.innerText = "⏳";
            if(heroNowTitle) heroNowTitle.innerText = "期待出發";
            if(heroNextTitle) heroNextTitle.innerText = "大阪京都行";
            if(heroNextTime) heroNextTime.innerText = `${diffDays} 天`;
            if(heroNextLabel) heroNextLabel.innerText = "距離出發";
        } else {
            if(heroNowTime) heroNowTime.innerText = "🏠";
            if(heroNowTitle) heroNowTitle.innerText = "旅途結束";
            if(heroNextTitle) heroNextTitle.innerText = "滿滿回憶";
            if(heroNextTime) heroNextTime.innerText = "End";
            if(heroNextLabel) heroNextLabel.innerText = "下個時間";
        }
        return; 
    }

    if(heroNextLabel) heroNextLabel.innerText = "下個時間";
    const currentScore = now.getHours() * 60 + now.getMinutes();
    const currentDayNum = date - 9; 
    const daySection = document.getElementById(`content-day${currentDayNum}`);
    if (!daySection) return;
    
    const items = Array.from(daySection.querySelectorAll('.time-item'));
    const itinerary = items.map(el => {
        const [h, m] = el.getAttribute('data-time').split(':').map(Number);
        return { time: el.getAttribute('data-time'), score: h * 60 + m, title: el.querySelector('.item-title').innerText };
    });
    
    let idx = itinerary.findLastIndex(item => currentScore >= item.score);
    if (idx === -1) {
        if(heroNowTime) heroNowTime.innerText = "晨間"; 
        if(heroNowTitle) heroNowTitle.innerText = "準備出門";
        if(heroNextTitle) heroNextTitle.innerText = itinerary[0].title; 
        if(heroNextTime) heroNextTime.innerText = itinerary[0].time;
    } else {
        const curr = itinerary[idx]; 
        const next = itinerary[idx + 1] || { time: "--:--", title: "行程結束" };
        if(heroNowTime) heroNowTime.innerText = curr.time; 
        if(heroNowTitle) heroNowTitle.innerText = curr.title;
        if(heroNextTitle) heroNextTitle.innerText = next.title; 
        if(heroNextTime) heroNextTime.innerText = next.time;

        let ratio = 0;
        if (next.time !== "--:--") {
            const totalMins = next.score - curr.score;
            const elapsedMins = currentScore - curr.score;
            if (totalMins > 0) ratio = Math.max(0, Math.min(1, elapsedMins / totalMins));
        }

        const modal = document.getElementById('itineraryModal');
        if (modal && modal.classList.contains('open')) {
            const modalHeader = document.querySelector('#modalBody h2');
            if (modalHeader && modalHeader.innerText.includes(`Day ${currentDayNum}`)) {
                const modalItems = document.querySelectorAll('#modalBody .time-item');
                if (modalItems[idx]) {
                    modalItems[idx].classList.add('active');
                    let mDist = 0;
                    if (modalItems[idx + 1]) mDist = modalItems[idx + 1].offsetTop - modalItems[idx].offsetTop;
                    modalItems[idx].style.setProperty('--dot-offset', (ratio * mDist) + 'px');
                }
            }
        }
    }
}

// =========================================
// 💱 匯率與真實刷卡試算 (升級版)
// =========================================
// 預設為較接近真實行情的 0.202 (若斷網時使用)
let baseJpyToTwd = 0.2020; 
let displayRate = 0.2020;

async function fetchExchangeRate() {
    const rateElement = document.getElementById('current-rate');
    const timeElement = document.getElementById('rate-update-time');
    
    try {
        // 使用更穩定的匯率 API
        const response = await fetch('https://open.er-api.com/v6/latest/JPY');
        const data = await response.json();
        
        if (data && data.rates && data.rates.TWD) {
            // API 抓到的是純市場中價
            const rawRate = data.rates.TWD;
            
            // 🌟 模擬銀行牌告溢價 (約加上 0.5% 作為發卡行的結匯基準)
            baseJpyToTwd = rawRate * 1.005; 
            
            // 為了版面美觀，四捨五入到小數點後四位
            displayRate = parseFloat(baseJpyToTwd.toFixed(4));
            
            rateElement.innerText = displayRate;
            
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeElement.innerText = `最後更新: ${hours}:${minutes} (含估算溢價)`;
            
            calculateExchange();
        }
    } catch (error) {
        console.error("無法抓取即時匯率，使用預設值", error);
        rateElement.innerText = displayRate.toFixed(4) + " (離線預估)";
        timeElement.innerText = "最後更新: 離線模式";
        calculateExchange();
    }
}

function calculateExchange() {
    const jpyInput = document.getElementById('jpy-input').value;
    const jpyAmount = parseFloat(jpyInput) || 0;
    
    // 💵 基礎現金匯率換算 (以包含溢價的 baseJpyToTwd 計算)
    const twdCash = jpyAmount * baseJpyToTwd;
    
    // 💳 Visa 預估：加上 1.5% 海外手續費
    const twdVisa = twdCash * 1.015; 
    
    // 💳 Mastercard 預估：通常結匯率比 Visa 便宜一點點 (我們假設省 0.15%)
    // 等同於 (基礎匯率 * 0.9985) * 1.015
    const twdMaster = (twdCash * 0.9985) * 1.015; 

    document.getElementById('twd-cash').innerText = `NT$ ${Math.round(twdCash).toLocaleString()}`;
    document.getElementById('twd-visa').innerText = `NT$ ${Math.round(twdVisa).toLocaleString()}`;
    document.getElementById('twd-master').innerText = `NT$ ${Math.round(twdMaster).toLocaleString()}`;
}

// =========================================
// 🚀 初始化與手勢監聽
// =========================================
function init() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn) toggleBtn.innerText = savedTheme === 'dark' ? '☀️' : '🌙';

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('✅ PWA 離線支援已啟動'))
                .catch(err => console.log('❌ PWA 註冊失敗', err));
        });
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            try {
                const geo = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
                const gData = await geo.json();
                let cityStr = gData.city || gData.principalSubdivision || "";
                let localityStr = gData.locality || "";
                let displayName = "目前位置";
                if (cityStr && localityStr && cityStr !== localityStr) displayName = `${cityStr} ${localityStr}`;
                else if (cityStr || localityStr) displayName = cityStr || localityStr;
                fetchWeather(lat, lon, displayName);
            } catch { fetchWeather(lat, lon, "目前位置"); }
        }, () => fetchWeather(34.666, 135.500, "大阪市 (預設)")); 
    } else { fetchWeather(34.666, 135.500, "大阪市 (預設)"); }

    syncFromCloud();
    renderExpenses(expenses.length === 0);
    updateItineraryPreview();
    setInterval(updateItineraryPreview, 30000); 
    
    // 啟動更準確的匯率抓取
    fetchExchangeRate();

    checkReservationReminder();
    setInterval(checkReservationReminder, 30000); 

    setTimeout(() => switchTab('home'), 100);

    const toggleArea = document.querySelector('.payer-toggle');
    const slider = document.querySelector('.toggle-slider');
    if (toggleArea && slider) {
        let isDragging = false; let startX = 0; let currentTranslate = 0; let maxTranslate = 0;
        toggleArea.addEventListener('touchstart', e => {
            isDragging = true; startX = e.changedTouches[0].clientX; maxTranslate = slider.offsetWidth;
            currentTranslate = document.getElementById('payer-jj').checked ? maxTranslate : 0;
            slider.style.transition = 'none';
        }, { passive: true });
        toggleArea.addEventListener('touchmove', e => {
            if (!isDragging) return;
            let diff = e.changedTouches[0].clientX - startX;
            let newTranslate = Math.max(0, Math.min(maxTranslate, currentTranslate + diff));
            slider.style.transform = `translateX(${newTranslate}px)`;
            if (Math.abs(diff) > 5 && e.cancelable) e.preventDefault();
        }, { passive: false });
        toggleArea.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false; let diff = e.changedTouches[0].clientX - startX;
            slider.style.transition = ''; slider.style.transform = '';
            if (Math.abs(diff) > 5) {
                if (currentTranslate + diff > maxTranslate / 2) document.getElementById('payer-jj').checked = true; 
                else document.getElementById('payer-timmy').checked = true; 
            }
        });
    }

    const tabBar = document.querySelector('.bottom-tab-bar');
    const tabIndicator = document.getElementById('tab-indicator');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabsList = ['home', 'expense', 'exchange'];

    if (tabBar && tabIndicator) {
        let isTabDragging = false; let tabStartX = 0; let initialIndicatorX = 0;
        tabBar.addEventListener('touchstart', e => {
            if (document.querySelector('.modal.open')) return;
            isTabDragging = true; tabStartX = e.changedTouches[0].clientX;
            const activeBtn = document.querySelector('.tab-btn.active');
            initialIndicatorX = activeBtn ? activeBtn.offsetLeft : 0;
            tabIndicator.style.transition = 'none';
        }, { passive: true });
        tabBar.addEventListener('touchmove', e => {
            if (!isTabDragging) return;
            let diff = e.changedTouches[0].clientX - tabStartX;
            let newTranslate = Math.max(0, Math.min(tabBar.offsetWidth - tabIndicator.offsetWidth, initialIndicatorX + diff));
            tabIndicator.style.transform = `translateX(${newTranslate}px)`;
            if (Math.abs(diff) > 5 && e.cancelable) e.preventDefault();
        }, { passive: false });
        tabBar.addEventListener('touchend', e => {
            if (!isTabDragging) return;
            isTabDragging = false; let diff = e.changedTouches[0].clientX - tabStartX;
            tabIndicator.style.transition = ''; 
            if (Math.abs(diff) > 10) {
                let indicatorCenter = initialIndicatorX + diff + (tabIndicator.offsetWidth / 2);
                let closestTab = tabsList[0]; let minDistance = Infinity;
                tabBtns.forEach((btn, index) => {
                    let distance = Math.abs(indicatorCenter - (btn.offsetLeft + (btn.offsetWidth / 2)));
                    if (distance < minDistance) { minDistance = distance; closestTab = tabsList[index]; }
                });
                switchTab(closestTab);
            } else {
                const activeBtn = document.querySelector('.tab-btn.active');
                if (activeBtn) tabIndicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
            }
        });
    }

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                if (this.id === 'itineraryModal') closeModal();
                else if (this.id === 'expenseModal') closeExpenseModal();
                else if (this.id === 'photoDiaryModal') closePhotoDiaryModal();
                else if (this.id === 'photoViewerModal') closePhotoViewer();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('resize', () => {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn) {
        const indicator = document.getElementById('tab-indicator');
        if(indicator) {
            indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
            indicator.style.width = `${activeBtn.offsetWidth}px`;
        }
    }
});

// =========================================
// 📷 旅程回憶錄邏輯
// =========================================
let travelPhotos = JSON.parse(localStorage.getItem('travelPhotos')) || {};
let currentUploadDay = 1;
let currentViewDay = null; 

function openPhotoDiaryModal(event) {
    currentActiveButton = event.currentTarget;
    const modal = document.getElementById('photoDiaryModal');
    modal.style.display = 'flex'; setModalOrigin(event); void modal.offsetWidth;
    modal.classList.add('open'); document.body.style.overflow = 'hidden'; 
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;
    renderPhotoDiary();
}

function closePhotoDiaryModal() {
    const modal = document.getElementById('photoDiaryModal');
    if (modal) {
        setModalOrigin(); modal.classList.remove('open');
        setTimeout(() => { if (!modal.classList.contains('open')) { modal.style.display = 'none'; currentActiveButton = null; } }, 300);
        document.body.style.overflow = '';
    }
}

function renderPhotoDiary() {
    const grid = document.querySelector('#photoDiaryModal #photo-grid');
    if (!grid) return; grid.innerHTML = '';
    for (let i = 1; i <= 8; i++) {
        if (!!travelPhotos[`day${i}`]) {
            grid.innerHTML += `<div class="photo-card" onclick="viewPhoto(${i})"><div class="photo-card-inner"><img src="${travelPhotos[`day${i}`]}" alt="Day ${i}"><div class="photo-overlay-label">Day ${i}</div></div></div>`;
        } else {
            grid.innerHTML += `<div class="photo-card" onclick="triggerUpload(${i})"><div class="photo-card-inner empty"><span class="photo-add-icon">➕</span><span class="photo-day-label">Day ${i}</span></div></div>`;
        }
    }
}

function triggerUpload(day) { currentUploadDay = day; document.getElementById('photo-upload-input').click(); }

function handlePhotoUpload(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas'); const scaleSize = 500 / img.width;
            canvas.width = 500; canvas.height = img.height * scaleSize;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            travelPhotos[`day${currentUploadDay}`] = canvas.toDataURL('image/jpeg', 0.6); 
            localStorage.setItem('travelPhotos', JSON.stringify(travelPhotos)); renderPhotoDiary();
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function viewPhoto(day) { 
    currentViewDay = day; 
    document.getElementById('viewer-img').src = travelPhotos[`day${day}`]; 
    const modal = document.getElementById('photoViewerModal'); 
    modal.style.display = 'flex'; 
    setTimeout(() => { modal.classList.add('open'); }, 10); 
}

function closePhotoViewer() { 
    const modal = document.getElementById('photoViewerModal'); 
    modal.classList.remove('open'); 
    setTimeout(() => { modal.style.display = 'none'; }, 300); 
}

function deletePhoto() { 
    if(confirm("確定要刪除這張照片嗎？")) { 
        delete travelPhotos[`day${currentViewDay}`]; 
        localStorage.setItem('travelPhotos', JSON.stringify(travelPhotos)); 
        renderPhotoDiary(); 
        closePhotoViewer(); 
    } 
}

// =========================================
// 💰 記帳本邏輯
// =========================================
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbx61FkjxrU5yKUmmvOw0kd_hvEUN73B8CfMZaTwFzyHfTPLN8n6L8rmkm4E6RgA2hUDRw/exec";
let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) { 
    currentActiveButton = event.currentTarget; 
    const modal = document.getElementById('expenseModal'); 
    modal.style.display = 'flex'; setModalOrigin(event); void modal.offsetWidth; 
    modal.classList.add('open'); document.body.style.overflow = 'hidden'; 
    renderExpenses(expenses.length === 0); 
    syncFromCloud(); 
}

function closeExpenseModal() { 
    const modal = document.getElementById('expenseModal'); 
    if (modal) { 
        setModalOrigin(); modal.classList.remove('open'); 
        setTimeout(() => { if (!modal.classList.contains('open')) { modal.style.display = 'none'; currentActiveButton = null; } }, 300); 
        document.body.style.overflow = ''; 
    } 
}

async function syncFromCloud() { 
    try { 
        const response = await fetch(CLOUD_API_URL + "?t=" + new Date().getTime()); 
        const data = await response.json(); 
        if (Array.isArray(data)) { 
            expenses = data; localStorage.setItem('travelExpenses', JSON.stringify(expenses)); 
            renderExpenses(); renderCategorySummary(); 
        } 
    } catch (error) { console.error("雲端同步失敗", error); } 
}

async function addExpense() {
    const amount = parseInt(document.getElementById('expense-amount').value);
    const descInput = document.getElementById('expense-desc').value;
    if (!amount || amount <= 0 || !descInput.trim()) { alert("請輸入有效的金額與項目！"); return; }
    const newExpense = { 
        action: "add", id: Date.now(), payer: document.querySelector('input[name="payer"]:checked').value, 
        amount: amount, desc: descInput.trim(), cat: document.querySelector('input[name="exp-cat"]:checked').value, 
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    };
    expenses.push(newExpense); localStorage.setItem('travelExpenses', JSON.stringify(expenses)); 
    renderExpenses(); renderCategorySummary();
    document.getElementById('expense-amount').value = ''; document.getElementById('expense-desc').value = '';
    
    fetch(CLOUD_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(newExpense) }).catch(e => console.error("雲端上傳失敗", e));
    
    const addBtn = document.querySelector('.add-btn');
    if (addBtn) {
        const originalText = addBtn.innerHTML; const originalBg = addBtn.style.background;
        addBtn.innerHTML = '✅ 已記錄！'; addBtn.style.background = '#34c759'; addBtn.style.transform = 'scale(1.02)';
        setTimeout(() => { addBtn.innerHTML = originalText; addBtn.style.background = originalBg; addBtn.style.transform = ''; }, 1200);
    }
}

async function deleteExpense(id) { 
    if(confirm("確定要刪除這筆紀錄嗎？")) { 
        expenses = expenses.filter(exp => exp.id != id); 
        localStorage.setItem('travelExpenses', JSON.stringify(expenses)); 
        renderExpenses(); renderCategorySummary(); 
        fetch(CLOUD_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: "delete", id: id }) }).catch(e => console.error("雲端刪除失敗", e)); 
    } 
}

function toggleCategorySummary() { 
    const view = document.getElementById('category-summary-view'); 
    if (view.style.display === 'none') { renderCategorySummary(); view.style.display = 'block'; } 
    else { view.style.display = 'none'; } 
}

function renderCategorySummary() {
    const view = document.getElementById('category-summary-view');
    let totals = { "餐食": 0, "交通": 0, "購物": 0, "其他": 0 }; let grandTotal = 0;
    expenses.forEach(exp => { let cat = exp.cat || "其他"; if(totals[cat] !== undefined) totals[cat] += parseInt(exp.amount); grandTotal += parseInt(exp.amount); });
    const colors = { "餐食": "#ffcc00", "交通": "#34c759", "購物": "#af52de", "其他": "#8e8e93" }; let html = '';
    for (const [cat, amt] of Object.entries(totals)) { 
        let percentage = grandTotal === 0 ? 0 : Math.round((amt / grandTotal) * 100); 
        html += `<div class="cat-bar-container"><span class="cat-label">${cat}</span><div class="cat-track"><div class="cat-fill" style="width: ${percentage}%; background: ${colors[cat]};"></div></div><span class="cat-amount">¥${amt.toLocaleString()}</span></div>`; 
    }
    view.innerHTML = html;
}

function renderExpenses(isLoading = false) {
    const listContainer = document.getElementById('expense-list'); if (!listContainer) return; listContainer.innerHTML = '';
    if (isLoading) { listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">☁️ 雲端同步中...</p>'; return; }
    let timmyTotal = 0; let jjTotal = 0; let itemIndex = 0;
    [...expenses].reverse().forEach(exp => {
        if (exp.payer === 'Timmy') { timmyTotal += parseInt(exp.amount); } else { jjTotal += parseInt(exp.amount); }
        listContainer.innerHTML += `<div class="exp-item" style="animation-delay: ${itemIndex * 0.05}s;"><div class="exp-item-left"><div class="exp-avatar ${exp.payer === 'Timmy' ? 'color-timmy' : 'color-jj'}">${exp.payer === 'Timmy' ? '👦🏻' : '👧🏻'}</div><div class="exp-info"><span class="exp-desc">${exp.cat ? `<span class="exp-cat-tag">${exp.cat}</span>` : ""}${exp.desc}</span><span class="exp-date">${exp.date}</span></div></div><div class="exp-item-right"><span class="exp-price">¥${parseInt(exp.amount).toLocaleString()}</span><div class="exp-delete" onclick="deleteExpense('${exp.id}')">🗑️</div></div></div>`;
        itemIndex++;
    });
    if(expenses.length === 0) listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">尚無紀錄，開始記帳吧！</p>';
    if(document.getElementById('total-amount')) document.getElementById('total-amount').innerText = (timmyTotal + jjTotal).toLocaleString();
    if(document.getElementById('timmy-paid')) document.getElementById('timmy-paid').innerText = timmyTotal.toLocaleString();
    if(document.getElementById('jj-paid')) document.getElementById('jj-paid').innerText = jjTotal.toLocaleString();
    const settlementText = document.getElementById('settlement-text');
    if(settlementText) {
        const diff = timmyTotal - jjTotal; const halfDiff = Math.abs(diff) / 2;
        if (diff > 0) { settlementText.innerHTML = `⚠️ <b>ㄐㄐ</b> 需給 Timmy： <b>¥${halfDiff.toLocaleString()}</b>`; settlementText.className = "settlement owe-timmy"; } 
        else if (diff < 0) { settlementText.innerHTML = `⚠️ <b>Timmy</b> 需給 ㄐㄐ： <b>¥${halfDiff.toLocaleString()}</b>`; settlementText.className = "settlement owe-jj"; } 
        else { settlementText.innerHTML = `✅ 目前帳目完美平衡`; settlementText.className = "settlement balanced"; }
    }
}
