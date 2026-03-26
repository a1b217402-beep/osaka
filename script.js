/* =========================================
   ☁️ 記帳本「雲端同步」邏輯 (Google Sheets API)
========================================= */

// 你的 Google Apps Script 雲端網址
const CLOUD_API_URL = "https://script.google.com/macros/s/AKfycbx61FkjxrU5yKUmmvOw0kd_hvEUN73B8CfMZaTwFzyHfTPLN8n6L8rmkm4E6RgA2hUDRw/exec";

let expenses = JSON.parse(localStorage.getItem('travelExpenses')) || [];

function openExpenseModal(event) {
    const modal = document.getElementById('expenseModal');
    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('open'); }, 10);
    document.body.style.overflow = 'hidden';
    
    // 1. 先用本地資料渲染
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

// ☁️ 從雲端抓取最新記帳資料 (防快取處理)
async function syncFromCloud() {
    try {
        const response = await fetch(CLOUD_API_URL + "?t=" + new Date().getTime());
        const data = await response.json();
        
        if (Array.isArray(data)) {
            expenses = data;
            localStorage.setItem('travelExpenses', JSON.stringify(expenses));
            renderExpenses();
        }
    } catch (error) {
        console.error("雲端同步失敗", error);
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
        action: "add", 
        id: Date.now(), 
        payer: payer, 
        amount: amount, 
        desc: descInput.trim(), 
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    };

    // 畫面先秒加
    expenses.push(newExpense);
    localStorage.setItem('travelExpenses', JSON.stringify(expenses));
    renderExpenses();
    
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-desc').value = '';

    // 🚀 改用 text/plain 強制繞過手機瀏覽器的 CORS 擋火牆
    fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(newExpense)
    }).catch(e => console.error("雲端上傳失敗", e));
}

// ☁️ 刪除花費並同步雲端
async function deleteExpense(id) {
    if(confirm("確定要刪除這筆紀錄嗎？")) {
        // 畫面先秒刪
        expenses = expenses.filter(exp => exp.id != id); 
        localStorage.setItem('travelExpenses', JSON.stringify(expenses));
        renderExpenses();

        // 🚀 同步通知雲端刪除
        fetch(CLOUD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "delete", id: id })
        }).catch(e => console.error("雲端刪除失敗", e));
    }
}

// 渲染結算畫面
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
