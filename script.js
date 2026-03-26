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
    // 嚴格判定是否在旅程區間 (8/10 ~ 8/17)
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

    // 判斷是否為「實際旅行期間」
    const isTripTime = (year === 2026 && month === 8 && date >= 10 && date <= 17);

    // 每次更新前，先清除網頁上所有的 active 閃爍圓點
    document.querySelectorAll('.time-item').forEach(el => el.classList.remove('active'));

    // 如果時間還沒到 8/10，或者已經超過 8/17
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
        return; // 終止後續的閃爍與追蹤邏輯
    }

    // --- 以下為旅行期間 (8/10 ~ 8/17) 的追蹤邏輯 ---
    const currentScore = now.getHours() * 60 + now.getMinutes();
    const currentDayNum = date - 9; // 8/10 轉換為 Day 1
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

        // 【列車站閃爍燈邏輯】只有「今天」的「當下行程」，圓點才會亮起
        if (items[currentIdx]) items[currentIdx].classList.add('active');

        // 如果當下正打開著今天的視窗，也讓視窗內的圓點亮起
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

    // 記帳本滑動切換邏輯
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
   💰 記帳本資料庫邏輯
========================================= */
let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) {
    const modal = document.getElementById('expenseModal');
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('open'); }, 10);
    document.body.style.overflow = 'hidden';
    renderExpenses();
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

function addExpense() {
    const payer = document.querySelector('input[name="payer"]:checked').value;
    const amountInput = document.getElementById('expense-amount').value;
    const descInput = document.getElementById('expense-desc').value;
    const amount = parseInt(amountInput);
    
    if (!amount || amount <= 0 || !descInput.trim()) { alert("請輸入有效的金額與項目！"); return; }

    const newExpense = { id: Date.now(), payer: payer, amount: amount, desc: descInput.trim(), date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) };
    expenses.push(newExpense);
    localStorage.setItem('travelExpenses', JSON.stringify(expenses));
    
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-desc').value = '';
    renderExpenses();
}

function deleteExpense(id) {
    if(confirm("確定要刪除這筆紀錄嗎？")) {
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem('travelExpenses', JSON.stringify(expenses));
        renderExpenses();
    }
}

function renderExpenses() {
    const listContainer = document.getElementById('expense-list');
    listContainer.innerHTML = '';
    let timmyTotal = 0; let jjTotal = 0;
    const reversedExpenses = [...expenses].reverse();

    reversedExpenses.forEach(exp => {
        if (exp.payer === 'Timmy') { timmyTotal += exp.amount; } else { jjTotal += exp.amount; }
        const iconStr = exp.payer === 'Timmy' ? '👦🏻' : '👧🏻';
        const colorClass = exp.payer === 'Timmy' ? 'color-timmy' : 'color-jj';
        listContainer.innerHTML += `<div class="exp-item"><div class="exp-item-left"><div class="exp-avatar ${colorClass}">${iconStr}</div><div class="exp-info"><span class="exp-desc">${exp.desc}</span><span class="exp-date">${exp.date}</span></div></div><div class="exp-item-right"><span class="exp-price">¥${exp.amount.toLocaleString()}</span><div class="exp-delete" onclick="deleteExpense(${exp.id})">🗑️</div></div></div>`;
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
