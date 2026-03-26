function openModal(dayId) {
    const modal = document.getElementById('itineraryModal');
    const modalBody = document.getElementById('modalBody');
    const content = document.getElementById('content-' + dayId);
    
    if (content) {
        modalBody.innerHTML = content.innerHTML;
        // 改用 Class 來控制，以利 CSS 動畫執行
        modal.classList.add('open');
        // 防止背景滾動
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('itineraryModal');
    // 移除 Class，觸發 CSS 淡出動畫
    modal.classList.remove('open');
    
    // 等待動畫結束後再隱藏結構 (配合 CSS 的 0.4s transition)
    setTimeout(() => {
        if (!modal.classList.contains('open')) {
            // 確保使用者沒有在動畫期間又點開
        }
    }, 400);
    
    // 恢復背景滾動
    document.body.style.overflow = '';
}

// 點擊空白處關閉
window.onclick = function(event) {
    const modal = document.getElementById('itineraryModal');
    // 注意：因為現在 modal 預設是 display: none，這裡的邏輯要判斷 target 是否為 modal 本身
    if (event.target === modal) {
        closeModal();
    }
}

// 支援 ESC 鍵關閉
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeModal();
    }
});
