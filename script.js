// Global Variables & Mock State (อ้างอิงจากโค้ดต้นฉบับของคุณ)
let db = null;
let auth = null;
let fbUser = null;
let appId = 'default_app_id';
let officersData = [];
let adminEmails = [];
let selectedOfficerId = '';
let currentUserEmail = '';

// Toast Notification Helper
function showToast(message, type = 'success') {
    console.log(`[Toast - ${type.toUpperCase()}]: ${message}`);
    // สามารถเพิ่มโค้ดแสดง UI Toast แจ้งเตือนเพิ่มเติมได้ที่นี่
}

// Render All Components (Placeholder)
function renderAll() {
    console.log("Rendering all components with data:", officersData);
}

// Update Auth UI (Placeholder)
function updateAuthUI() {
    console.log("Updating Auth UI for user:", fbUser ? fbUser.email : 'Guest');
}

// Modal Login Placeholder
function openGoogleLoginModal() {
    console.log("Opening Google Login Modal...");
}

// Sync Helper Functions
function updateSyncBadge(status, message) {
    const dot = document.getElementById('cloudSyncDot');
    const text = document.getElementById('cloudSyncText');
    const badge = document.getElementById('cloudSyncBadge');
    if (!dot || !text || !badge) return;

    if (status === 'saving') {
        badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 transition-all';
        dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
        text.textContent = message || 'กำลังบันทึก...';
    } else if (status === 'saved') {
        badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all';
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        text.textContent = message || 'บันทึกข้อมูลแล้ว';
    } else if (status === 'error') {
        badge.className = 'hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 transition-all';
        dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        text.textContent = message || 'บันทึกไม่สำเร็จ';
    }
}

async function saveAllToCloud() {
    if (!db || !fbUser) return false;
    updateSyncBadge('saving', 'กำลังบันทึกข้อมูล...');
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'hipps_system', 'master_state');
        await setDoc(docRef, {
            officers: JSON.stringify(officersData),
            adminEmails: adminEmails,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUserEmail || 'system'
        });
        updateSyncBadge('saved', 'บันทึกบนคลาวด์แล้ว');
        return true;
    } catch (err) {
        console.error("Cloud save error:", err);
        updateSyncBadge('error', 'บันทึกขัดข้อง');
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', 'error');
        return false;
    }
}
window.saveAllToCloud = saveAllToCloud;

// Initialize Authentication & Real-time Firestore Listener
async function initCloudStorage() {
    if (!db || !auth) {
        updateSyncBadge('error', 'โหมดออฟไลน์');
        renderAll();
        return;
    }

    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (authErr) {
        console.error("Auth init error:", authErr);
    }

    onAuthStateChanged(auth, (user) => {
        fbUser = user;
        if (!user) return;

        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'hipps_system', 'master_state');
        onSnapshot(docRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.officers) {
                    try {
                        officersData = JSON.parse(data.officers);
                    } catch (e) {
                        console.error("Parse error:", e);
                    }
                }
                if (Array.isArray(data.adminEmails) && data.adminEmails.length > 0) {
                    adminEmails = data.adminEmails;
                }
                // Ensure selectedOfficerId remains valid
                if (officersData.length > 0 && !officersData.some(o => o.id === selectedOfficerId)) {
                    selectedOfficerId = officersData[0].id;
                } else if (officersData.length === 0) {
                    selectedOfficerId = '';
                }
                updateSyncBadge('saved', 'ซิงค์ข้อมูลล่าสุดแล้ว');
                updateAuthUI();
                renderAll();
            } else {
                // First time initialization: save default initial dataset to cloud
                await saveAllToCloud();
                updateAuthUI();
                renderAll();
            }
        }, (error) => {
            console.error("Snapshot listener error:", error);
            updateSyncBadge('error', 'เชื่อมต่อข้อมูลขัดข้อง');
        });
    });
}