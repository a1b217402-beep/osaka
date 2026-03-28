let currentActiveButton = null;

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
        updateItineraryPreview();
    }
}

function openCurrentDayPreview(event) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    let dayNum = 1;
    
    // 正確的旅程時間判定 2026/8/10 ~ 2026/8/17
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
        }, 300); 
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
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();

    const heroNowTime = document.getElementById('preview-now-time');
    const heroNowTitle = document.getElementById('preview-now-title');
    const heroNextTitle = document.getElementById('preview-next-title');
    const heroNextTime = document.getElementById('preview-next-time');
    const heroNextLabel = document.getElementById('preview-next-label');

    const isTripTime = (year === 2026 && month === 8 && date >= 10 && date <= 17);
    
    document.querySelectorAll('.time-item').forEach(el => {
        el.classList.remove('active');
        el.style.setProperty('--dot-offset', '0px');
    });

    const targetDate = new Date(2026, 7, 10); 
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (!isTripTime) {
        if (diffDays > 0) {
            if(heroNowTime) heroNowTime.innerText = "⏳";
            if(heroNowTitle) heroNowTitle.innerText = "期待出發";
            if(heroNextTitle) heroNextTitle.innerText = "大阪京都行";
            if(heroNextTime) heroNextTime.innerText = `${diffDays} 天`;
            if(heroNextLabel) heroNextLabel.innerText = "距離出發";
        } else {
            if(heroNowTime) heroNowTime.innerText = "🏠";
            if(heroNowTitle) heroNowTitle.innerText = "旅途結束";
            if(heroNextTitle) heroNextTitle.innerText = "整理滿滿回憶";
            if(heroNextTime) heroNextTime.innerText = "End";
            if(heroNextLabel) heroNextLabel.innerText = "下個時間";
        }
        return; 
    }

    if(heroNextLabel) heroNextLabel.innerText = "下個時間";
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
    
    if (itinerary.length === 0) {
        if(heroNowTime) heroNowTime.innerText = "--:--"; 
        if(heroNowTitle) heroNowTitle.innerText = "自由活動";
        if(heroNextTitle) heroNextTitle.innerText = "探索城市"; 
        if(heroNextTime) heroNextTime.innerText = "--:--";
    } else if (currentIdx === -1) {
        if(heroNowTime) heroNowTime.innerText = "晨間"; 
        if(heroNowTitle) heroNowTitle.innerText = "準備出門";
        if(heroNextTitle) heroNextTitle.innerText = itinerary[0].title; 
        if(heroNextTime) heroNextTime.innerText = itinerary[0].time;
    } else {
        const currentItem = itinerary[currentIdx];
        const nextItem = itinerary[currentIdx + 1] || { time: "--:--", title: "行程結束" };
        if(heroNowTime) heroNowTime.innerText = currentItem.time; 
        if(heroNowTitle) heroNowTitle.innerText = currentItem.title;
        if(heroNextTitle) heroNextTitle.innerText = nextItem.title; 
        if(heroNextTime) heroNextTime.innerText = nextItem.time;

        let ratio = 0;
        if (nextItem.time !== "--:--") {
            const totalMins = nextItem.score - currentItem.score;
            const elapsedMins = currentScore - currentItem.score;
            if (totalMins > 0) {
                ratio = Math.max(0, Math.min(1, elapsedMins / totalMins));
            }
        }

        const modal = document.getElementById('itineraryModal');
        if (modal && modal.classList.contains('open')) {
            const modalHeader = document.querySelector('#modalBody h2');
            if (modalHeader && modalHeader.innerText.includes(`Day ${currentDayNum}`)) {
                const modalItems = document.querySelectorAll('#modalBody .time-item');
                if (modalItems[currentIdx]) {
                    modalItems[currentIdx].classList.add('active');
                    let mDistance = 0;
                    if (modalItems[currentIdx + 1]) {
                        mDistance = modalItems[currentIdx + 1].offsetTop - modalItems[currentIdx].offsetTop;
                    }
                    modalItems[currentIdx].style.setProperty('--dot-offset', (ratio * mDistance) + 'px');
                }
            }
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
    renderPhotoDiary();

    const toggleArea = document.querySelector('.payer-toggle');
    const slider = document.querySelector('.toggle-slider');
    
    if (toggleArea && slider) {
        let isDragging = false; let startX = 0; let currentTranslate = 0; let maxTranslate = 0;
        
        toggleArea.addEventListener('touchstart', e => {
            isDragging = true; 
            startX = e.changedTouches[0].clientX;
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
            slider.style.transition = ''; 
            slider.style.transform = '';
            if (Math.abs(diff) > 5) {
                let finalTranslate = currentTranslate + diff;
                if (finalTranslate > maxTranslate / 2) { 
                    document.getElementById('payer-jj').checked = true; 
                } else { 
                    document.getElementById('payer-timmy').checked = true; 
                }
            }
        });
    }

    // 🚀 全新修正：綁定所有 Modal 的點擊事件，讓點擊視窗外緣（空白處）完美關閉視窗
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            // 確保點擊到的是背景 (modal 本身)，而不是白色的視窗內容 (modal-content)
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

/* =========================================
   📷 旅程回憶錄邏輯 (Modal 彈出視窗)
========================================= */
let travelPhotos = JSON.parse(localStorage.getItem('travelPhotos')) || {};
let currentUploadDay = 1;
let currentViewDay = null; 

function openPhotoDiaryModal(event) {
    currentActiveButton = event.currentTarget;
    const modal = document.getElementById('photoDiaryModal');
    modal.style.display = 'flex';
    setModalOrigin(event);
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderPhotoDiary();
}

function closePhotoDiaryModal() {
    const modal = document.getElementById('photoDiaryModal');
    if (modal) {
        setModalOrigin();
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

function renderPhotoDiary() {
    const grid = document.querySelector('#photoDiaryModal #photo-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let i = 1; i <= 8; i++) {
        const hasPhoto = !!travelPhotos[`day${i}`];
        if (hasPhoto) {
            grid.innerHTML += `
                <div class="photo-card" onclick="viewPhoto(${i})">
                    <div class="photo-card-inner">
                        <img src="${travelPhotos[`day${i}`]}" alt="Day ${i}">
                        <div class="photo-overlay-label">Day ${i}</div>
                    </div>
                </div>`;
        } else {
            grid.innerHTML += `
                <div class="photo-card" onclick="triggerUpload(${i})">
                    <div class="photo-card-inner empty">
                        <span class="photo-add-icon">➕</span>
                        <span class="photo-day-label">Day ${i}</span>
                    </div>
                </div>`;
        }
    }
}

function triggerUpload(day) {
    currentUploadDay = day;
    document.getElementById('photo-upload-input').click();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.6); 
            travelPhotos[`day${currentUploadDay}`] = base64;
            localStorage.setItem('travelPhotos', JSON.stringify(travelPhotos));
            renderPhotoDiary();
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function viewPhoto(day) {
    currentViewDay = day;
    const modal = document.getElementById('photoViewerModal');
    document.getElementById('viewer-img').src = travelPhotos[`day${day}`];
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

/* =========================================
   ☁️ 記帳本邏輯
========================================= */
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbx61FkjxrU5yKUmmvOw0kd_hvEUN73B8CfMZaTwFzyHfTPLN8n6L8rmkm4E6RgA2hUDRw/exec";
let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) {
    currentActiveButton = event.currentTarget;
    const modal = document.getElementById('expenseModal');
    modal.style.display = 'flex';
    setModalOrigin(event);
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderExpenses(expenses.length === 0); 
    syncFromCloud();
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if (modal) {
        setModalOrigin();
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

async function syncFromCloud() {
    try {
        const response = await fetch(CLOUD_API_URL + "?t=" + new Date().getTime());
        const data = await response.json();
        if (Array.isArray(data)) {
            expenses = data;
            localStorage.setItem('travelExpenses', JSON.stringify(expenses));
            renderExpenses();
            renderCategorySummary();
        }
    } catch (error) { console.error("雲端同步失敗", error); }
}

async function addExpense() {
    const payer = document.querySelector('input[name="payer"]:checked').value;
    const category = document.querySelector('input[name="exp-cat"]:checked').value;
    const amountInput = document.getElementById('expense-amount').value;
    const descInput = document.getElementById('expense-desc').value;
    const amount = parseInt(amountInput);
    
    if (!amount || amount <= 0 || !descInput.trim()) { alert("請輸入有效的金額與項目！"); return; }

    const newExpense = { 
        action: "add", 
        id: Date.now(), 
        payer: payer, 
        amount: amount, 
        desc: descInput.trim(), 
        cat: category,
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    };

    expenses.push(newExpense);
    localStorage.setItem('travelExpenses', JSON.stringify(expenses));
    renderExpenses();
    renderCategorySummary();
    
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-desc').value = '';

    fetch(CLOUD_API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify(newExpense)
    }).catch(e => console.error("雲端上傳失敗", e));
}

async function deleteExpense(id) {
    if(confirm("確定要刪除這筆紀錄嗎？")) {
        expenses = expenses.filter(exp => exp.id != id); 
        localStorage.setItem('travelExpenses', JSON.stringify(expenses));
        renderExpenses();
        renderCategorySummary();

        fetch(CLOUD_API_URL, {
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
            body: JSON.stringify({ action: "delete", id: id })
        }).catch(e => console.error("雲端刪除失敗", e));
    }
}

function toggleCategorySummary() {
    const view = document.getElementById('category-summary-view');
    if (view.style.display === 'none') {
        renderCategorySummary();
        view.style.display = 'block';
    } else { 
        view.style.display = 'none'; 
    }
}

function renderCategorySummary() {
    const view = document.getElementById('category-summary-view');
    let totals = { "餐食": 0, "交通": 0, "購物": 0, "其他": 0 };
    let grandTotal = 0;

    expenses.forEach(exp => {
        let cat = exp.cat || "其他"; 
        if(totals[cat] !== undefined) totals[cat] += parseInt(exp.amount);
        grandTotal += parseInt(exp.amount);
    });

    const colors = { "餐食": "#ffcc00", "交通": "#34c759", "購物": "#af52de", "其他": "#8e8e93" };
    let html = '';
    for (const [cat, amt] of Object.entries(totals)) {
        let percentage = grandTotal === 0 ? 0 : Math.round((amt / grandTotal) * 100);
        html += `
            <div class="cat-bar-container">
                <span class="cat-label">${cat}</span>
                <div class="cat-track">
                    <div class="cat-fill" style="width: ${percentage}%; background: ${colors[cat]};"></div>
                </div>
                <span class="cat-amount">¥${amt.toLocaleString()}</span>
            </div>`;
    }
    view.innerHTML = html;
}

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
        if (exp.payer === 'Timmy') { 
            timmyTotal += parseInt(exp.amount); 
        } else { 
            jjTotal += parseInt(exp.amount); 
        }
        
        const iconStr = exp.payer === 'Timmy' ? '👦🏻' : '👧🏻';
        const colorClass = exp.payer === 'Timmy' ? 'color-timmy' : 'color-jj';
        const catTag = exp.cat ? `<span class="exp-cat-tag">${exp.cat}</span>` : ""; 
        
        listContainer.innerHTML += `
            <div class="exp-item">
                <div class="exp-item-left">
                    <div class="exp-avatar ${colorClass}">${iconStr}</div>
                    <div class="exp-info">
                        <span class="exp-desc">${catTag}${exp.desc}</span>
                        <span class="exp-date">${exp.date}</span>
                    </div>
                </div>
                <div class="exp-item-right">
                    <span class="exp-price">¥${parseInt(exp.amount).toLocaleString()}</span>
                    <div class="exp-delete" onclick="deleteExpense('${exp.id}')">🗑️</div>
                </div>
            </div>`;
    });

    if(reversedExpenses.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#86868b; font-size:12px; margin-top:20px;">尚無紀錄，開始記帳吧！</p>';
    }

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
