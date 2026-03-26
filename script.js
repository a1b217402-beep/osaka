let currentActiveButton = null;

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

function openCurrentDayPreview(event) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    let dayNum = 1;
    if (year === 2026 && month === 8 && date >= 10 && date <= 17) {
        dayNum = date - 9; 
    }
    openModal('day' + dayNum, event);
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
        titleDesc.innerHTML = `${getWeatherEmoji(data.current_weather.weathercode)} ${Math.round(data.current_weather.temperature)}°C`;

        const nowHour = new Date().getHours();
        let startIndex = data.hourly.time.findIndex(t => parseInt(t.substring(11, 13)) === nowHour);
        if (startIndex === -1) startIndex = 0;

        let html = '';
        for (let i = startIndex; i < startIndex + 24; i++) {
            if (!data.hourly.time[i]) break;
            const label = (i === startIndex) ? "現在" : data.hourly.time[i].substring(11, 16);
            html += `<div class="hourly-item"><span class="h-time serif">${label}</span><span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span><span class="h-temp serif">${Math.round(data.hourly.temperature_2m[i])}°</span></div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) { titleDesc.innerHTML = "同步中"; }
}

function updateItineraryPreview() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();

    const heroNowTime = document.getElementById('preview-now-time');
    const heroNowTitle = document.getElementById('preview-now-title');
    const heroNextTitle = document.getElementById('preview-next-title');
    const heroNextTime = document.getElementById('preview-next-time');

    const isTripTime = (year === 2026 && month === 8 && date >= 10 && date <= 17);
    document.querySelectorAll('.time-item').forEach(el => el.classList.remove('active'));

    if (!isTripTime) {
        if (year < 2026 || (year === 2026 && (month < 8 || (month === 8 && date < 10)))) {
            if(heroNowTime) heroNowTime.innerText = "8/10";
            if(heroNowTitle) heroNowTitle.innerText = "期待出發";
            if(heroNextTitle) heroNextTitle.innerText = "大阪京都行";
            if(heroNextTime) heroNextTime.innerText = "Day 1";
        } else {
            if(heroNowTime) heroNowTime.innerText = "🏠";
            if(heroNowTitle) heroNowTitle.innerText = "旅途結束";
            if(heroNextTitle) heroNextTitle.innerText = "整理滿滿回憶";
            if(heroNextTime) heroNextTime.innerText = "End";
        }
        return; 
    }

    const currentScore = now.getHours() * 60 + now.getMinutes();
    const currentDayNum = date - 9; 
    const dayDataId = `content-day${currentDayNum}`;
    const daySection = document.getElementById(dayDataId);

    if (!daySection) return;

    const items = Array.from(daySection.querySelectorAll('.time-item'));
    const itinerary = items.map(el => {
        const [h, m] = el.getAttribute('data-time').split(':').map(Number);
        const titleEl = el.querySelector('.item-title');
        const itemTitle = titleEl ? titleEl.innerText : el.querySelector('span:last-child').innerText;
        return { time: el.getAttribute('data-time'), score: h * 60 + m, title: itemTitle };
    });

    let currentIdx = itinerary.findLastIndex(item => currentScore >= item.score);
    
    if (currentIdx === -1) {
        heroNowTime.innerText = "晨間";
        heroNowTitle.innerText = "準備出門";
        heroNextTitle.innerText = itinerary[0].title;
        heroNextTime.innerText = itinerary[0].time;
    } else {
        const currentItem = itinerary[currentIdx];
        const nextItem = itinerary[currentIdx + 1] || { time: "--:--", title: "行程結束" };
        heroNowTime.innerText = currentItem.time;
        heroNowTitle.innerText = currentItem.title;
        heroNextTitle.innerText = nextItem.title;
        heroNextTime.innerText = nextItem.time;

        if (items[currentIdx]) items[currentIdx].classList.add('active');

        const modal = document.getElementById('itineraryModal');
        const modalHeader = document.querySelector('#modalBody h2');
        if (modal.classList.contains('open') && modalHeader && modalHeader.innerText.includes(`Day ${currentDayNum}`)) {
            const modalItems = document.querySelectorAll('#modalBody .time-item');
            if (modalItems[currentIdx]) modalItems[currentIdx].classList.add('active');
        }
    }
}

function init() {
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

    updateItineraryPreview();
    setInterval(updateItineraryPreview, 30000);

    const toggleArea = document.querySelector('.payer-toggle');
    const slider = document.querySelector('.toggle-slider');
    
    if (toggleArea && slider) {
        let isDragging = false; let startX = 0; let currentTranslate = 0; let maxTranslate = 0;
        
        toggleArea.addEventListener('touchstart', e => {
            isDragging = true; startX = e.changedTouches[0].clientX;
            maxTranslate = slider.offsetWidth;
            const radioJJ = document.getElementById('payer-jj');
            currentTranslate = radioJJ.checked ? maxTranslate : 0;
            slider.style.transition = 'none';
        }, { passive: true });
        
        toggleArea.addEventListener('touchmove', e => {
            if (!isDragging) return;
            let currentX = e.changedTouches[0].clientX;
            let diff = currentX - startX;
            let newTranslate = currentTranslate + diff;
            if (newTranslate < 0) newTranslate = 0;
            if (newTranslate > maxTranslate) newTranslate = maxTranslate;
            slider.style.transform = `translateX(${newTranslate}px)`;
            if (Math.abs(diff) > 5 && e.cancelable) e.preventDefault();
        }, { passive: false });
        
        toggleArea.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            let diff = e.changedTouches[0].clientX - startX;
            slider.style.transition = ''; slider.style.transform = '';
            if (Math.abs(diff) > 5) {
                let finalTranslate = currentTranslate + diff;
                if (finalTranslate > maxTranslate / 2) { document.getElementById('payer-jj').checked = true; } 
                else { document.getElementById('payer-timmy').checked = true; }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', init);

/* =========================================
   ☁️ 記帳本「雲端同步」邏輯 (Google Sheets API)
========================================= */

// 你的 Google Apps Script 雲端網址
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbx61FkjxrU5yKUmmvOw0kd_hvEUN73B8CfMZaTwFzyHfTPLN8n6L8rmkm4E6RgA2hUDRw/exec";

// 優先使用本地暫存，確保一打開就有畫面
let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) {
    const modal = document.getElementById('expenseModal');
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('open'); }, 10);
    document.body.style.overflow = 'hidden';
    
    // 1. 先用本地資料秒速渲染畫面 (如果有資料的話)
    renderExpenses(expenses.length === 0); 
    
    // 2. 背景偷偷去雲端抓最新資料
    syncFromCloud();
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
}

window.onclick = function(event) {
    const itModal = document.getElementById('itineraryModal');
    const expModal = document.getElementById('expenseModal');
    if (event.target === itModal) closeModal();
    if (event.target === expModal) closeExpenseModal();
};

// ☁️ 從雲端抓取最新記帳資料
async function syncFromCloud() {
    try {
        // 加上時間戳記防止手機瀏覽器快取舊資料
        const response = await fetch(CLOUD_API_URL + "?t=" + new Date().getTime());
        const data = await response.json();
        
        // 更新本地端資料並存檔
        expenses = data;
        localStorage.setItem('travelExpenses', JSON.stringify(expenses));
        
        // 重新渲染畫面
        renderExpenses();
    } catch (error) {
        console.error("雲端同步失敗，使用本地資料顯示", error);
    }
}

// ☁️ 新增一筆花費並上傳雲端
async function addExpense() {
    const payer = document.querySelector('input[name="payer"]:checked').value;
    const amountInput = document.getElementById('expense-amount').value;
    const descInput = document.getElementById('expense-desc').value;
    const amount = parseInt(amountInput);
    
    if (!amount || amount <= 0 || !descInput.trim()) { alert("請輸入有效的金額與項目！"); return; }

    const newExpense = { 
        action: "add", // 告訴雲端我們要新增
        id: Date.now(), 
        payer: payer, 
        amount: amount, 
        desc: descInput.trim(), 
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    };

    // 【無感同步】1. 先直接塞入畫面，讓使用者覺得超順暢
    expenses.push(newExpense);
    localStorage.setItem('travelExpenses', JSON.stringify(expenses));
    renderExpenses();
    
    // 清空輸入框
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-desc').value = '';

    // 【無感同步】2. 背景偷偷發送給 Google 試算表
    try {
        await fetch(CLOUD_API_URL, {
            method: 'POST',
            mode: 'no-cors', // 避開跨域限制
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newExpense)
        });
        // 不需等待回應，試算表會自己記錄
    } catch(e) { console.error("雲端上傳失敗", e); }
}

// ☁️ 刪除花費並同步雲端
async function deleteExpense(id) {
    if(confirm("確定要刪除這筆紀錄嗎？")) {
        // 【無感同步】1. 畫面先秒刪
        expenses = expenses.filter(exp => exp.id != id); // 使用 != 避免型別問題
        localStorage.setItem('travelExpenses', JSON.stringify(expenses));
        renderExpenses();

        // 【無感同步】2. 背景通知 Google 試算表刪除這筆
        try {
            await fetch(CLOUD_API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "delete", id: id })
            });
        } catch(e) { console.error("雲端刪除失敗", e); }
    }
}

// 渲染結算畫面 (新增了 isLoading 狀態)
function renderExpenses(isLoading = false) {
    const listContainer = document.getElementById('expense-list');
    listContainer.innerHTML = '';
    
    if (isLoading) {
        listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">☁️ 雲端同步中...</p>';
        return;
    }

    let timmyTotal = 0; let jjTotal = 0;
    const reversedExpenses = [...expenses].reverse();

    reversedExpenses.forEach(exp => {
        if (exp.payer === 'Timmy') { timmyTotal += parseInt(exp.amount); } 
        else { jjTotal += parseInt(exp.amount); }
        const iconStr = exp.payer === 'Timmy' ? '👦🏻' : '👧🏻';
        const colorClass = exp.payer === 'Timmy' ? 'color-timmy' : 'color-jj';
        listContainer.innerHTML += `<div class="exp-item"><div class="exp-item-left"><div class="exp-avatar ${colorClass}">${iconStr}</div><div class="exp-info"><span class="exp-desc">${exp.desc}</span><span class="exp-date">${exp.date}</span></div></div><div class="exp-item-right"><span class="exp-price">¥${parseInt(exp.amount).toLocaleString()}</span><div class="exp-delete" onclick="deleteExpense('${exp.id}')">🗑️</div></div></div>`;
    });

    if(reversedExpenses.length === 0) listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">尚無紀錄，開始記帳吧！</p>';

    const total = timmyTotal + jjTotal;
    document.getElementById('total-amount').innerText = total.toLocaleString();
    document.getElementById('timmy-paid').innerText = timmyTotal.toLocaleString();
    document.getElementById('jj-paid').innerText = jjTotal.toLocaleString();

    const settlementText = document.getElementById('settlement-text');
    const diff = timmyTotal - jjTotal;
    const halfDiff = Math.abs(diff) / 2;

    if (diff > 0) {
        settlementText.innerHTML = `⚠️ <b>ㄐㄐ</b> 需給 Timmy： <b>¥${halfDiff.toLocaleString()}</b>`;
        settlementText.className = "settlement owe-timmy";
    } else if (diff < 0) {
        settlementText.innerHTML = `⚠️ <b>Timmy</b> 需給 ㄐㄐ： <b>¥${halfDiff.toLocaleString()}</b>`;
        settlementText.className = "settlement owe-jj";
    } else {
        settlementText.innerHTML = `✅ 目前帳目完美平衡`;
        settlementText.className = "settlement balanced";
    }
}
