const display = document.getElementById('display');

// 1. טעינת נתונים בטעינת הדף
window.onload = () => {
    const saved = localStorage.getItem('shared_result');
    if (saved) { display.value = saved; }
};

// 2. לוגיקת המחשבון
function appendNumber(num) { display.value += num; }
function appendOperator(op) { display.value += op; }
function clearDisplay() { display.value = ''; }
function calculate() {
    try {
        const result = eval(display.value);
        display.value = result;
        localStorage.setItem('shared_result', result);
    } catch (e) { display.value = "שגיאה"; }
}

// 3. לוגיקת הקלטה (IndexedDB עם ניהול גרסה חדש)
let mediaRecorder;
let audioChunks = [];
let audioStream = null;

async function startRecording() {
    audioChunks = [];
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // בחירת פורמט שמע אוניברסלי
        const options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'audio/webm';
        }
        
        mediaRecorder = new MediaRecorder(audioStream, options);
        
        mediaRecorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
            
            // פתיחת מסד נתונים חדש בשם AudioProjectDB
            const request = indexedDB.open("AudioProjectDB", 1);
            
            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("recordings")) {
                    db.createObjectStore("recordings");
                }
            };

            request.onsuccess = e => {
                const db = e.target.result;
                const transaction = db.transaction("recordings", "readwrite");
                const store = transaction.objectStore("recordings");
                const putRequest = store.put(blob, "shared_audio");

                putRequest.onsuccess = () => {
                    document.getElementById('playRec').disabled = false;
                    alert("ההקלטה מוכנה! נסה ללחוץ על נגן.");
                };
            };
        };

        mediaRecorder.start(100); // הקלטה במקצבים של 100ms ליציבות
        document.getElementById('startRec').disabled = true;
        document.getElementById('stopRec').disabled = false;
    } catch (err) {
        alert("לא ניתן לגשת למיקרופון: " + err);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }
        document.getElementById('startRec').disabled = false;
        document.getElementById('stopRec').disabled = true;
    }
}

function playLocalRecording() {
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
                const audio = new Audio(audioUrl);
                audio.play().catch(err => {
                    console.error("Playback error:", err);
                    alert("שגיאה בהשמעה. וודא שהרמקולים דולקים.");
                });
            } else {
                alert("לא נמצאה הקלטה בזיכרון החדש.");
            }
        };
    };
}

function deleteRecording() {
    const request = indexedDB.open("AudioProjectDB", 1);
    request.onsuccess = e => {
        const db = e.target.result;
        const transaction = db.transaction("recordings", "readwrite");
        transaction.objectStore("recordings").delete("shared_audio");
        document.getElementById('playRec').disabled = true;
        alert("ההקלטה נמחקה.");
    };
}