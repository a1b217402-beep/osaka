js_content = '''
function openModal(dayId) {
    const modal = document.getElementById('itineraryModal');
    const modalBody = document.getElementById('modalBody');
    const content = document.getElementById('content-' + dayId).innerHTML;
    
    modalBody.innerHTML = content;
    modal.style.display = "block";
}

function closeModal() {
    document.getElementById('itineraryModal').style.display = "none";
}

// 點擊視窗外部也可關閉
window.onclick = function(event) {
    const modal = document.getElementById('itineraryModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
'''
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(js_content)
print("script.js 已更新互動邏輯！")