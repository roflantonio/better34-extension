const i18n = {
    ru: {
        sent: "Отправлено в ТГ:",
        down: "Скачано на ПК:",
        reset: "Сбросить статистику",
        resetDone: "✅ Сброшено!",
        log: "Лог ошибок",
        clear: "Очистить",
        enabled: "Включено:",
        noErrors: "Ошибок нет. Всё работает отлично!",
        settingsTitle: "Настройки Telegram",
        tokenLbl: "Bot API Token:",
        chatLbl: "Chat ID (@channel):",
        saveBtn: "Сохранить",
        saveBtnDone: "✅ Сохранено!",
        backBtn: "⬅️ Назад"
    },
    en: {
        sent: "Sent to TG:",
        down: "Saved to PC:",
        reset: "Reset statistics",
        resetDone: "✅ Reset!",
        log: "Error log",
        clear: "Clear",
        enabled: "Enabled:",
        noErrors: "No errors. Everything is fine!",
        settingsTitle: "Telegram Settings",
        tokenLbl: "Bot API Token:",
        chatLbl: "Chat ID (@channel):",
        saveBtn: "Save",
        saveBtnDone: "✅ Saved!",
        backBtn: "⬅️ Back"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Элементы главного экрана
    const mainView = document.getElementById('main-view');
    const toggle = document.getElementById('extToggle');
    const sentEl = document.getElementById('sentCount');
    const downEl = document.getElementById('downloadCount');
    const resetBtn = document.getElementById('resetStats');
    const logViewer = document.getElementById('logViewer');
    const clearLogsBtn = document.getElementById('clearLogs');
    const langBtns = document.querySelectorAll('.lang-btn');
    const openSettingsBtn = document.getElementById('open-settings');

    // Элементы экрана настроек
    const settingsView = document.getElementById('settings-view');
    const botTokenInput = document.getElementById('botTokenInput');
    const chatIdInput = document.getElementById('chatIdInput');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    let currentLang = 'ru'; 

    function updateLanguage(lang) {
        currentLang = lang;
        document.getElementById('lbl-sent').textContent = i18n[lang].sent;
        document.getElementById('lbl-down').textContent = i18n[lang].down;
        resetBtn.textContent = i18n[lang].reset;
        document.getElementById('lbl-log').textContent = i18n[lang].log;
        clearLogsBtn.textContent = i18n[lang].clear;
        document.getElementById('lbl-enabled').textContent = i18n[lang].enabled;
        
        // Перевод настроек
        document.getElementById('lbl-settings').textContent = i18n[lang].settingsTitle;
        document.getElementById('lbl-token').textContent = i18n[lang].tokenLbl;
        document.getElementById('lbl-chat').textContent = i18n[lang].chatLbl;
        saveSettingsBtn.textContent = i18n[lang].saveBtn;
        closeSettingsBtn.textContent = i18n[lang].backBtn;

        langBtns.forEach(btn => {
            if (btn.dataset.lang === lang) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        chrome.storage.local.get(['errorLog'], (data) => {
            if (!data.errorLog || data.errorLog.length === 0) {
                logViewer.value = i18n[lang].noErrors;
            }
        });
    }

    // Загрузка данных
    chrome.storage.local.get(['extEnabled', 'sentCount', 'downloadCount', 'errorLog', 'extLang', 'botToken', 'chatId'], (data) => {
        toggle.checked = data.extEnabled !== false; 
        sentEl.textContent = data.sentCount || 0;
        downEl.textContent = data.downloadCount || 0;
        
        botTokenInput.value = data.botToken || '';
        chatIdInput.value = data.chatId || '';

        const loadedLang = data.extLang || 'ru';
        updateLanguage(loadedLang);

        if (data.errorLog && data.errorLog.length > 0) {
            logViewer.value = data.errorLog.join('\n');
            logViewer.style.color = '#c0392b';
        } else {
            logViewer.value = i18n[loadedLang].noErrors;
            logViewer.style.color = '#27ae60';
        }
    });

    // Навигация
    openSettingsBtn.addEventListener('click', () => {
        mainView.style.display = 'none';
        settingsView.style.display = 'block';
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsView.style.display = 'none';
        mainView.style.display = 'block';
    });

    // Сохранение настроек API
    saveSettingsBtn.addEventListener('click', () => {
        const token = botTokenInput.value.trim();
        const chat = chatIdInput.value.trim();
        
        chrome.storage.local.set({ botToken: token, chatId: chat }, () => {
            saveSettingsBtn.textContent = i18n[currentLang].saveBtnDone;
            saveSettingsBtn.style.backgroundColor = '#27ae60';
            setTimeout(() => { 
                saveSettingsBtn.textContent = i18n[currentLang].saveBtn;
                // Возвращаем обычный зеленый цвет, если он менялся
            }, 1500);
        });
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedLang = btn.dataset.lang;
            chrome.storage.local.set({ extLang: selectedLang }, () => {
                updateLanguage(selectedLang);
            });
        });
    });

    toggle.addEventListener('change', () => {
        chrome.storage.local.set({ extEnabled: toggle.checked });
    });

    resetBtn.addEventListener('click', () => {
        chrome.storage.local.set({ sentCount: 0, downloadCount: 0 }, () => {
            sentEl.textContent = 0;
            downEl.textContent = 0;
            resetBtn.textContent = i18n[currentLang].resetDone;
            setTimeout(() => { resetBtn.textContent = i18n[currentLang].reset; }, 1500);
        });
    });

    clearLogsBtn.addEventListener('click', () => {
        chrome.storage.local.set({ errorLog: [] }, () => {
            logViewer.value = i18n[currentLang].noErrors;
            logViewer.style.color = '#27ae60';
        });
    });
});