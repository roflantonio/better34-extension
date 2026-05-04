// ==UserScript==
// @name         better34 (Mobile Edition)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Optimize browsing and content collection on Rule34
// @match        *://rule34.xxx/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.telegram.org
// @connect      wimg.rule34.xxx
// @connect      us.rule34.xxx
// ==/UserScript==

(function() {
    'use strict';

    function valGet(key, def) {
        if (typeof GM_getValue !== 'undefined') {
            let res = GM_getValue(key, undefined);
            if (res !== undefined) return res;
        }
        try {
            let ls = localStorage.getItem('b34_' + key);
            if (ls !== null) return JSON.parse(ls);
        } catch(e) {}
        return def;
    }

    function valSet(key, val) {
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue(key, val);
        }
        try {
            localStorage.setItem('b34_' + key, JSON.stringify(val));
        } catch(e) {}
    }

    const t = {
        ru: {
            banner: '🟢 better34 активно', saved: '✅ Уже в коллекции', sendTg: '⬆️ Отправить в ТГК',
            downPc: '💾 Скачать', fitIn: '🔍 Вписать в экран', fitOut: '🔎 Вернуть размер',
            back: '⬅️ Назад', boringTxt: 'автор гамно ливай', hide: 'Скрыть',
            sending: '⏳ Отправка...', sent: '✅ Отправлено!', wait: (s) => `⏳ Жди ${s} сек`,
            probFile: '⬇️ Тяжелый файл, качаю...', savedPc: '✅ Скачано!', err: '❌ Ошибка',
            noMedia: '❌ Медиа не найдено', downloading: '⏳ Загрузка...', canceled: '❌ Отменено',
            downingActive: '✅ Скачивается!', noCreds: '❌ Укажи ключи в ⚙️',
            settingsTitle: "Настройки Telegram", tokenLbl: "Bot API Token:", chatLbl: "Chat ID:",
            saveBtn: "Сохранить", saveBtnDone: "✅ Сохранено!", closeBtn: "Закрыть",
            sentStat: "Отправлено в ТГ:", downStat: "Скачано:", logTitle: "Лог ошибок", clearLog: "Очистить", resetStat: "Сбросить статистику",
            manualWarn: "⚠️ Файл слишком тяжелый или огромный. Скрипт может вылететь. Лучше скачай вручную через зажатие на картинке.",
            autoReturnLbl: "Авто-возврат в поиск:"
        },
        en: {
            banner: '🟢 better34 active', saved: '✅ Already in collection', sendTg: '⬆️ Send to TG',
            downPc: '💾 Download', fitIn: '🔍 Fit to screen', fitOut: '🔎 Reset size',
            back: '⬅️ Back', boringTxt: 'trash author leave', hide: 'Hide',
            sending: '⏳ Sending...', sent: '✅ Sent!', wait: (s) => `⏳ Wait ${s} sec`,
            probFile: '⬇️ Large file, downloading...', savedPc: '✅ Saved!', err: '❌ Error',
            noMedia: '❌ Media not found', downloading: '⏳ Downloading...', canceled: '❌ Canceled',
            downingActive: '✅ Downloading!', noCreds: '❌ Setup keys in ⚙️',
            settingsTitle: "Telegram Settings", tokenLbl: "Bot API Token:", chatLbl: "Chat ID:",
            saveBtn: "Save", saveBtnDone: "✅ Saved!", closeBtn: "Close",
            sentStat: "Sent to TG:", downStat: "Downloaded:", logTitle: "Error log", clearLog: "Clear", resetStat: "Reset stats",
            manualWarn: "⚠️ File is too large or has extreme resolution. Script might crash. Better download manually via long-press on image.",
            autoReturnLbl: "Auto-return to search:"
        }
    };

    function getLang() { return valGet('extLang', 'ru'); }
    function L(key) { return t[getLang()][key]; }

    function incrementStat(key) {
        let val = valGet(key, 0);
        valSet(key, val + 1);
    }

    function logError(message) {
        let logs = valGet('errorLog', []);
        const time = new Date().toLocaleTimeString('ru-RU');
        logs.unshift(`[${time}] ${message}`);
        if (logs.length > 10) logs = logs.slice(0, 10);
        valSet('errorLog', logs);
        updateSettingsUI();
    }

    async function downloadFileBlob(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET", url: url, responseType: "blob",
                onload: (res) => { if (res.status === 200) resolve(res.response); else reject(new Error('Fetch failed')); },
                onerror: () => reject(new Error('Network error'))
            });
        });
    }

    async function sendMediaToTelegram(mediaUrl, captionText) {
        const token = valGet('botToken', '');
        const chat = valGet('chatId', '');
        if (!token || !chat) throw new Error('no_credentials');
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.webm');
        const isGif = mediaUrl.includes('.gif');
        let apiMethod = isVideo ? 'sendVideo' : (isGif ? 'sendAnimation' : 'sendPhoto');
        let mediaField = isVideo ? 'video' : (isGif ? 'animation' : 'photo');
        const blob = await downloadFileBlob(mediaUrl);
        let fileName = mediaUrl.split('/').pop().split('?')[0] || 'file';
        const formData = new FormData();
        formData.append('chat_id', chat);
        formData.append(mediaField, blob, fileName);
        if (captionText) formData.append('caption', captionText);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST", url: `https://api.telegram.org/bot${token}/${apiMethod}`, data: formData,
                onload: (res) => {
                    const result = JSON.parse(res.responseText);
                    if (!result.ok) {
                        if (result.error_code === 429) {
                            const waitTime = result.parameters?.retry_after || result.description.match(/\d+/)[0] || 15;
                            reject(new Error(`флуд-контроль: ${waitTime}`));
                        }
                        reject(new Error(`Отклонено Telegram: ${result.description}`));
                    } else resolve(true);
                },
                onerror: () => reject(new Error('API request failed'))
            });
        });
    }

    async function downloadToDevice(mediaUrl) {
        const blob = await downloadFileBlob(mediaUrl);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none'; a.href = blobUrl;
        a.download = mediaUrl.split('/').pop().split('?')[0] || 'download';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return true;
    }

    function injectSettingsMenu() {
        if (document.getElementById('b34-settings-btn')) return;
        const gearBtn = document.createElement('button');
        gearBtn.id = 'b34-settings-btn';
        gearBtn.innerHTML = '⚙️';
        gearBtn.style = 'position: fixed; bottom: 20px; right: 20px; font-size: 26px; background: #2c3e50; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2147483646; text-align: center; width: 50px; height: 50px; line-height: 50px; -webkit-appearance: none;';
        document.body.appendChild(gearBtn);
        const modal = document.createElement('div');
        modal.id = 'b34-settings-modal';
        modal.style = 'display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 320px; max-width: 90%; background: #f9f9f9; padding: 20px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.7); z-index: 2147483647; font-family: Arial, sans-serif; color: #333; box-sizing: border-box;';
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 id="b34-st-title" style="margin: 0; font-size: 18px;">Настройки</h3>
                <div style="display: flex; gap: 10px;">
                    <span class="b34-lang" data-lang="en" style="cursor: pointer; opacity: 0.3; font-size: 22px;">🇺🇸</span>
                    <span class="b34-lang" data-lang="ru" style="cursor: pointer; opacity: 0.3; font-size: 22px;">🇷🇺</span>
                </div>
            </div>
            <label id="b34-st-toklbl" style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 5px;"></label>
            <input type="text" id="b34-token" style="width: 100%; padding: 10px; margin-bottom: 15px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; font-family: monospace; font-size: 14px;">
            <label id="b34-st-chatlbl" style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 5px;"></label>
            <input type="text" id="b34-chat" style="width: 100%; padding: 10px; margin-bottom: 15px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; font-family: monospace; font-size: 14px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 15px; font-weight: bold;">
                <span id="b34-st-autoretlbl">Авто-возврат в поиск:</span>
                <input type="checkbox" id="b34-auto-return" style="transform: scale(1.3); cursor: pointer;">
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px;"><span id="b34-st-sentlbl"></span> <b id="b34-val-sent" style="color:#0088cc;">0</b></div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 15px;"><span id="b34-st-downlbl"></span> <b id="b34-val-down" style="color:#0088cc;">0</b></div>
            <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #e74c3c; margin-bottom: 5px;"><b id="b34-st-loglbl"></b> <span id="b34-clear-log" style="cursor: pointer; text-decoration: underline; color: #7f8c8d; padding: 5px;"></span></div>
                <textarea id="b34-log" readonly style="width: 100%; height: 60px; font-size: 10px; font-family: monospace; border: 1px solid #ccc; border-radius: 4px; padding: 5px; box-sizing: border-box; color: #c0392b;"></textarea>
            </div>
            <div style="display: flex; gap: 10px;"><button id="b34-save" style="flex: 1; padding: 12px; background: #27ae60; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;"></button><button id="b34-close" style="flex: 1; padding: 12px; background: #34495e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 16px;"></button></div>
            <button id="b34-reset" style="width: 100%; padding: 10px; margin-top: 10px; background: #bdc3c7; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px;"></button>
        `;
        document.body.appendChild(modal);
        gearBtn.addEventListener('click', (e) => { e.preventDefault(); updateSettingsUI(); modal.style.display = 'block'; });
        document.getElementById('b34-close').addEventListener('click', (e) => { e.preventDefault(); modal.style.display = 'none'; });
        document.getElementById('b34-save').addEventListener('click', (e) => {
            e.preventDefault(); 
            valSet('botToken', document.getElementById('b34-token').value.trim()); 
            valSet('chatId', document.getElementById('b34-chat').value.trim());
            valSet('autoReturn', document.getElementById('b34-auto-return').checked);
            const btn = document.getElementById('b34-save'); btn.textContent = L('saveBtnDone'); setTimeout(() => btn.textContent = L('saveBtn'), 1500);
        });
        document.getElementById('b34-reset').addEventListener('click', (e) => { e.preventDefault(); valSet('sentCount', 0); valSet('downloadCount', 0); updateSettingsUI(); });
        document.getElementById('b34-clear-log').addEventListener('click', (e) => { e.preventDefault(); valSet('errorLog', []); updateSettingsUI(); });
        document.querySelectorAll('.b34-lang').forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); valSet('extLang', btn.dataset.lang); updateSettingsUI(); const c = document.getElementById('b34-btn-container'); if(c) { c.remove(); initPostLogic(); } });
        });
    }

    function updateSettingsUI() {
        const lang = getLang();
        document.getElementById('b34-st-title').textContent = L('settingsTitle');
        document.getElementById('b34-st-toklbl').textContent = L('tokenLbl');
        document.getElementById('b34-st-chatlbl').textContent = L('chatLbl');
        document.getElementById('b34-st-autoretlbl').textContent = L('autoReturnLbl');
        document.getElementById('b34-save').textContent = L('saveBtn');
        document.getElementById('b34-close').textContent = L('closeBtn');
        document.getElementById('b34-st-sentlbl').textContent = L('sentStat');
        document.getElementById('b34-st-downlbl').textContent = L('downStat');
        document.getElementById('b34-st-loglbl').textContent = L('logTitle');
        document.getElementById('b34-clear-log').textContent = L('clearLog');
        document.getElementById('b34-reset').textContent = L('resetStat');
        
        document.getElementById('b34-token').value = valGet('botToken', '');
        document.getElementById('b34-chat').value = valGet('chatId', '');
        document.getElementById('b34-auto-return').checked = valGet('autoReturn', true);
        
        document.getElementById('b34-val-sent').textContent = valGet('sentCount', 0);
        document.getElementById('b34-val-down').textContent = valGet('downloadCount', 0);
        const logs = valGet('errorLog', []);
        document.getElementById('b34-log').value = logs.length ? logs.join('\n') : "OK";
        document.querySelectorAll('.b34-lang').forEach(btn => { btn.style.opacity = (btn.dataset.lang === lang) ? '1' : '0.3'; });
    }

    function parsePostStats() {
        let stats = { size: 0, width: 0, height: 0 };
        document.querySelectorAll('#tag-sidebar li').forEach(li => {
            let text = li.innerText.toLowerCase();
            if (text.includes('size:')) {
                let match = text.match(/([\d.]+)\s*(mb|kb)/);
                if (match) {
                    let val = parseFloat(match[1]);
                    stats.size = (match[2] === 'mb') ? val : val / 1024;
                }
            }
            if (text.includes('resolution:')) {
                let res = text.split(':')[1].trim().split('x');
                if (res.length === 2) { stats.width = parseInt(res[0]); stats.height = parseInt(res[1]); }
            }
        });
        return stats;
    }

    function init() {
        injectSettingsMenu();
        const savedPosts = valGet('savedPosts', {}); const viewedPosts = valGet('viewedPosts', {});
        markThumbnails(savedPosts, viewedPosts);
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('page') === 'post' && urlParams.get('s') === 'view' && urlParams.has('id')) {
            const currentPostId = urlParams.get('id');
            if (currentPostId && !viewedPosts[currentPostId]) { viewedPosts[currentPostId] = true; valSet('viewedPosts', viewedPosts); }
            initPostLogic();
        }
    }

    function markThumbnails(savedPosts, viewedPosts) {
        document.querySelectorAll('.thumb a').forEach(link => {
            try {
                const url = new URL(link.href, window.location.origin);
                const id = url.searchParams.get('id');
                if (id && (savedPosts[id] || viewedPosts[id])) {
                    let marker = link.querySelector('.r34-ext-marker');
                    if (!marker) {
                        link.style.position = 'relative'; link.style.display = 'inline-block';
                        marker = document.createElement('div'); marker.className = 'r34-ext-marker'; link.appendChild(marker);
                    }
                    if (savedPosts[id]) {
                        marker.innerHTML = '✅'; marker.style = 'position: absolute; top: 5px; left: 5px; font-size: 14px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; pointer-events: none; z-index: 10; line-height: 1;';
                    } else if (viewedPosts[id]) {
                        marker.innerHTML = '👁️'; marker.style = 'position: absolute; top: 5px; left: 5px; font-size: 14px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; pointer-events: none; z-index: 10; line-height: 1; opacity: 0.8;';
                    }
                }
            } catch (e) {}
        });
    }

    function initPostLogic() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentPostId = urlParams.get('id');
        const sidebar = document.querySelector('.sidebar') || document.querySelector('#tag-sidebar');
        if (!sidebar || document.getElementById('send-to-tg-btn')) return;

        const stats = parsePostStats();
        const isRisky = stats.size > 30 || stats.width > 8000 || stats.height > 8000;

        const isAlreadySaved = valGet('savedPosts', {})[currentPostId] === true;
        const savedBadgeHtml = isAlreadySaved ? `<div style="background-color: #27ae60; color: white; padding: 6px; border-radius: 5px; text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 10px; border: 1px solid #1e8449;">${L('saved')}</div>` : '';

        const btnContainer = document.createElement('div');
        btnContainer.id = 'b34-btn-container';
        btnContainer.innerHTML = `
            ${savedBadgeHtml}
            <a href="#" id="send-to-tg-btn" style="background-color: #0088cc; color: white; padding: 14px; border-radius: 6px; text-decoration: none; display: block; margin-top: 10px; margin-bottom: 8px; font-weight: bold; text-align: center; font-size: 18px;">${L('sendTg')}</a>
            <a href="#" id="download-pc-btn" style="background-color: #8e44ad; color: white; padding: 14px; border-radius: 6px; text-decoration: none; display: block; margin-bottom: 8px; font-weight: bold; text-align: center; font-size: 18px;">${L('downPc')}</a>
            <a href="#" id="resize-img-btn" style="background-color: #e67e22; color: white; padding: 14px; border-radius: 6px; text-decoration: none; display: block; margin-bottom: 8px; font-weight: bold; text-align: center; font-size: 18px;">${L('fitIn')}</a>
            <a href="#" id="go-back-btn" style="background-color: #34495e; color: white; padding: 14px; border-radius: 6px; text-decoration: none; display: block; margin-bottom: 15px; font-weight: bold; text-align: center; font-size: 18px;">${L('back')}</a>
        `;
        sidebar.insertBefore(btnContainer, sidebar.firstChild);

        if (isRisky) {
            const warn = document.createElement('div');
            warn.innerHTML = `<div style="background-color: #c0392b; color: white; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-size: 12px; font-weight: bold; line-height: 1.4; border: 2px solid #8e1c12;">${L('manualWarn')}</div>`;
            sidebar.insertBefore(warn, btnContainer);
        }

        function forceBackAndRefresh() {
            if (!valGet('autoReturn', true)) return; // <-- ПРОВЕРКА ТУМБЛЕРА
            if (document.referrer && document.referrer.includes('rule34.xxx')) window.location.href = document.referrer; 
            else window.history.back();
        }

        function getMediaUrl() {
            let mediaUrl = null;
            document.querySelectorAll('a').forEach(link => { if (link.textContent.includes('Original image') || link.textContent.includes('Download')) mediaUrl = link.href; });
            if (!mediaUrl) { const vid = document.querySelector('video source') || document.querySelector('video'); if (vid) mediaUrl = vid.src; }
            if (!mediaUrl) { const img = document.querySelector('#image'); if (img) mediaUrl = img.src; }
            return mediaUrl;
        }

        function getArtistTags() {
            let tags = [];
            document.querySelectorAll('.tag-type-artist a').forEach(link => {
                if (link.href.includes('&tags=')) {
                    let tagName = link.textContent.trim().replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_');
                    tags.push('#' + tagName);
                }
            });
            return tags.length > 0 ? tags.join(' ') : '#Rule34';
        }

        const currentArtistTags = getArtistTags();
        document.getElementById('go-back-btn').onclick = (e) => { e.preventDefault(); forceBackAndRefresh(); };
        document.getElementById('send-to-tg-btn').onclick = async (e) => {
            e.preventDefault(); const btn = document.getElementById('send-to-tg-btn'); if (btn.dataset.blocked === 'true') return;
            btn.dataset.blocked = 'true'; btn.innerHTML = L('sending'); btn.style.backgroundColor = '#f39c12';
            const mediaUrl = getMediaUrl();
            if (!mediaUrl) { btn.innerHTML = L('noMedia'); btn.style.backgroundColor = '#c0392b'; setTimeout(() => { btn.innerHTML = L('sendTg'); btn.style.backgroundColor = '#0088cc'; btn.dataset.blocked = 'false'; }, 3000); return; }
            try {
                await sendMediaToTelegram(mediaUrl, currentArtistTags); incrementStat('sentCount');
                btn.innerHTML = L('sent'); btn.style.backgroundColor = '#27ae60';
                let db = valGet('savedPosts', {}); if (currentPostId) db[currentPostId] = true; valSet('savedPosts', db);
                
                // Если авто-возврат выключен, оставляем кнопку зеленой и снимаем блокировку через 3 секунды
                if (!valGet('autoReturn', true)) {
                    setTimeout(() => { btn.innerHTML = L('sendTg'); btn.style.backgroundColor = '#0088cc'; btn.dataset.blocked = 'false'; }, 3000);
                } else {
                    setTimeout(() => forceBackAndRefresh(), 1000);
                }
            } catch (err) {
                const msg = err.message.toLowerCase();
                if (msg.includes('флуд-контроль')) {
                    let s = parseInt(msg.match(/\d+/)[0] || 15); btn.style.backgroundColor = '#d35400';
                    const timer = setInterval(() => { s--; if (s > 0) btn.innerHTML = t[getLang()].wait(s); else { clearInterval(timer); btn.innerHTML = L('sendTg'); btn.style.backgroundColor = '#0088cc'; btn.dataset.blocked = 'false'; } }, 1000);
                } else if (msg.includes('too big') || msg.includes('request entity too large') || msg.includes('invalid_dimensions')) {
                    btn.innerHTML = L('probFile'); btn.style.backgroundColor = '#8e44ad';
                    try { 
                        await downloadToDevice(mediaUrl); incrementStat('downloadCount'); btn.innerHTML = L('savedPc'); let db = valGet('savedPosts', {}); if (currentPostId) db[currentPostId] = true; valSet('savedPosts', db); 
                        if (!valGet('autoReturn', true)) { setTimeout(() => { btn.innerHTML = L('sendTg'); btn.style.backgroundColor = '#0088cc'; btn.dataset.blocked = 'false'; }, 3000); }
                        else { setTimeout(() => forceBackAndRefresh(), 1000); }
                    } catch (dErr) { btn.innerHTML = L('err'); btn.style.backgroundColor = '#c0392b'; }
                } else { logError(`ТГК: ${err.message}`); btn.innerHTML = L('err'); btn.style.backgroundColor = '#c0392b'; }
                setTimeout(() => { btn.innerHTML = L('sendTg'); btn.style.backgroundColor = '#0088cc'; btn.dataset.blocked = 'false'; }, 3000);
            }
        };

        document.getElementById('download-pc-btn').onclick = async (e) => {
            e.preventDefault(); const btn = document.getElementById('download-pc-btn'); if (btn.dataset.blocked === 'true') return;
            btn.dataset.blocked = 'true'; btn.innerHTML = L('downloading'); btn.style.backgroundColor = '#f39c12';
            const mediaUrl = getMediaUrl(); if(!mediaUrl) return;
            try {
                await downloadToDevice(mediaUrl); incrementStat('downloadCount'); btn.innerHTML = L('downingActive'); btn.style.backgroundColor = '#27ae60';
                let db = valGet('savedPosts', {}); if (currentPostId) db[currentPostId] = true; valSet('savedPosts', db); 
                
                if (!valGet('autoReturn', true)) {
                    setTimeout(() => { btn.innerHTML = L('downPc'); btn.style.backgroundColor = '#8e44ad'; btn.dataset.blocked = 'false'; }, 3000);
                } else {
                    setTimeout(() => forceBackAndRefresh(), 1000);
                }
            } catch (err) { if(!err.message.includes('canceled')) logError(`ПК: ${err.message}`); btn.innerHTML = L('err'); btn.style.backgroundColor = '#c0392b'; setTimeout(() => { btn.innerHTML = L('downPc'); btn.style.backgroundColor = '#8e44ad'; btn.dataset.blocked = 'false'; }, 2000); }
        };

        const mediaElement = document.querySelector('#image') || document.querySelector('video');
        const resizeBtn = document.getElementById('resize-img-btn');
        let currentResizeState = valGet('autoResizeEnabled', false);
        function applyResizeStyles(shouldResize) {
            if (!mediaElement) return;
            if (shouldResize) { mediaElement.style.maxWidth = '100%'; mediaElement.style.maxHeight = '90vh'; mediaElement.style.objectFit = 'contain'; mediaElement.style.width = 'auto'; mediaElement.style.height = 'auto'; resizeBtn.innerHTML = L('fitOut'); }
            else { mediaElement.style.maxWidth = ''; mediaElement.style.maxHeight = ''; mediaElement.style.objectFit = ''; mediaElement.style.width = ''; mediaElement.style.height = ''; resizeBtn.innerHTML = L('fitIn'); }
        }
        if (currentResizeState) applyResizeStyles(true);
        resizeBtn.onclick = (e) => { e.preventDefault(); currentResizeState = !currentResizeState; valSet('autoResizeEnabled', currentResizeState); applyResizeStyles(currentResizeState); if (currentResizeState && mediaElement) mediaElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    }

    init();
})();
