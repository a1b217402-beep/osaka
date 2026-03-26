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

// 修正點：新增點擊動態看板進入當日行程的功能
function openCurrentDayPreview(event) {
    const now = new Date();
    // 判斷今天是第幾天 (8/10為Day1，以此類推至8/17為Day8)
    let dayNum = (now.getMonth() + 1 === 8 && now.getDate() >= 10 && now.getDate() <= 17) 
                    ? now.getDate() - 9 : 1; 
    
    // 將點擊事件傳入，這樣視窗就會從預覽方塊中心帥氣地彈出
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

window.onclick = function(event) {
    const modal = document.getElementById('itineraryModal');
    if (event.target === modal) closeModal();
};

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
            html += `
                <div class="hourly-item">
                    <span class="h-time serif">${label}</span>
                    <span class="h-icon">${getWeatherEmoji(data.hourly.weathercode[i])}</span>
                    <span class="h-temp serif">${Math.round(data.hourly.temperature_2m[i])}°</span>
                </div>`;
        }
        hourlyContainer.innerHTML = html;
    } catch (e) { titleDesc.innerHTML = "同步中"; }
}

function updateItineraryPreview() {
    const now = new Date();
    const currentScore = now.getHours() * 60 + now.getMinutes();
    let dayDataId = (now.getMonth() + 1 === 8 && now.getDate() >= 10 && now.getDate() <= 17) 
                    ? `content-day${now.getDate() - 9}` : "content-day1";

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
    if (currentIdx === -1) currentIdx = 0;

    const currentItem = itinerary[currentIdx];
    const nextItem = itinerary[currentIdx + 1] || { time: "--:--", title: "行程結束" };

    document.getElementById('preview-now-time').innerText = currentItem.time;
    document.getElementById('preview-now-title').innerText = currentItem.title;
    document.getElementById('preview-next-title').innerText = nextItem.title;
    document.getElementById('preview-next-time').innerText = nextItem.time;
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
}

document.addEventListener('DOMContentLoaded', init);

/* =========================================
   💰 記帳本專用邏輯 (Timmy & ㄐㄐ)
========================================= */

// 從瀏覽器本地讀取記帳資料，若無則為空陣列
let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) {
    const modal = document.getElementById('expenseModal');
    modal.style.display = 'flex';
    
    // 動畫效果
    setTimeout(() => { modal.classList.add('open'); }, 10);
    document.body.style.overflow = 'hidden';
    
    // 每次打開時更新結算畫面
    renderExpenses();
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    modal.classList.remove('open');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
}

// 修改原有的 window.onclick，讓點擊背景也能關閉記帳本
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
    
    if (!amount || amount <= 0 || !descInput.trim()) {
        alert("請輸入有效的金額與項目！");
        return;
    }

    // 建立新一筆帳目
    const newExpense = {
        id: Date.now(),
        payer: payer,
        amount: amount,
        desc: descInput.trim(),
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    expenses.push(newExpense);
    localStorage.setItem('travelExpenses', JSON.stringify(expenses)); // 存檔
    
    // 清空輸入框
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
    
    let timmyTotal = 0;
    let jjTotal = 0;

    // 將陣列反轉，讓最新的花費顯示在最上面
    const reversedExpenses = [...expenses].reverse();

    reversedExpenses.forEach(exp => {
        if (exp.payer === 'Timmy') {
            timmyTotal += exp.amount;
        } else {
            jjTotal += exp.amount;
        }

        const iconStr = exp.payer === 'Timmy' ? '👦🏻' : '👧🏻';
        const colorClass = exp.payer === 'Timmy' ? 'color-timmy' : 'color-jj';

        listContainer.innerHTML += `
            <div class="exp-item">
                <div class="exp-item-left">
                    <div class="exp-avatar ${colorClass}">${iconStr}</div>
                    <div class="exp-info">
                        <span class="exp-desc">${exp.desc}</span>
                        <span class="exp-date">${exp.date}</span>
                    </div>
                </div>
                <div class="exp-item-right">
                    <span class="exp-price">¥${exp.amount.toLocaleString()}</span>
                    <div class="exp-delete" onclick="deleteExpense(${exp.id})">🗑️</div>
                </div>
            </div>
        `;
    });

    if(reversedExpenses.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">尚無紀錄，開始記帳吧！</p>';
    }

    // 更新總覽面板
    const total = timmyTotal + jjTotal;
    document.getElementById('total-amount').innerText = total.toLocaleString();
    document.getElementById('timmy-paid').innerText = timmyTotal.toLocaleString();
    document.getElementById('jj-paid').innerText = jjTotal.toLocaleString();

    // 核心結算邏輯 (AA制計算)
    const settlementText = document.getElementById('settlement-text');
    const diff = timmyTotal - jjTotal;
    
    // 假設 AA制，多付的人應該拿回一半的差額
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
