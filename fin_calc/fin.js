// 1. טעינת תוצאה מהמחשבון הרגיל בטעינת הדף
window.onload = () => {
    const saved = localStorage.getItem('shared_result');
    if (saved) {
        document.getElementById('loanAmount').value = saved;
    }
};

// 2. לוגיקת המחשבון הפיננסי
function calculateLoan() {
    const P = parseFloat(document.getElementById('loanAmount').value);
    const r = (parseFloat(document.getElementById('interestRate').value) / 100) / 12;
    const m = parseFloat(document.getElementById('monthlyPayment').value);

    if (!P || !r || !m) {
        alert("נא למלא את כל השדות");
        return;
    }

    const checkValue = 1 - (r * P) / m;
    if (checkValue <= 0) {
        document.getElementById('result').innerText = "ההחזר נמוך מדי לכיסוי הריבית!";
        return;
    }

    const n = -Math.log(checkValue) / Math.log(1 + r);
    const months = Math.ceil(n);
    
    document.getElementById('result').innerText = `זמן החזר: ${months} חודשים (${(months/12).toFixed(1)} שנים)`;
}

// 3. לוגיקת נגן השמע עם תמיכה בעצירה והמשך
let currentAudio = null;

function playAudio() {
    // אם כבר יש אודיו טעון והוא בהשהיה - פשוט נמשיך אותו
    if (currentAudio && currentAudio.paused) {
        currentAudio.play();
        return;
    }

    // אם אין אודיו טעון (או שהוא סיים), נטען אותו מהזיכרון
    const request = indexedDB.open("AudioProjectDB", 1);
    
    request.onsuccess = e => {
        const db = e.target.result;
        const transaction = db.transaction("recordings", "readonly");
        const store = transaction.objectStore("recordings");
        const getRequest = store.get("shared_audio");
        
        getRequest.onsuccess = () => {
            const audioBlob = getRequest.result;
            if (audioBlob) {
                const audioUrl = URL.createObjectURL(audioBlob);
                currentAudio = new Audio(audioUrl);
                currentAudio.play().catch(err => alert("שגיאה בניגון: " + err));
                
                // ניקוי הכתובת הזמנית כשהאודיו מסתיים כדי למנוע עומס זיכרון
                currentAudio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    currentAudio = null;
                };
            } else {
                alert("לא נמצאה הקלטה להשמעה.");
            }
        };
    };
}

function pauseAudio() {
    if (currentAudio) {
        currentAudio.pause();
    }
}

function deleteAudio() {
    const request = indexedDB.open("AudioProjectDB", 1);
    request.onsuccess = e => {
        const db = e.target.result;
        const transaction = db.transaction("recordings", "readwrite");
        transaction.objectStore("recordings").delete("shared_audio");
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        alert("ההקלטה נמחקה");
    };
}