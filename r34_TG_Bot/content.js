// СЛОВАРИ ДЛЯ САЙТА
const t = {
    ru: {
        banner: '🟢 better34 активно',
        saved: '✅ Уже в коллекции',
        sendTg: '⬆️ Отправить в ТГК',
        downPc: '💾 Скачать на ПК',
        fitIn: '🔍 Вписать в экран',
        fitOut: '🔎 Вернуть размер',
        back: '⬅️ Назад',
        boringTxt: 'автор гамно ливай',
        hide: 'Скрыть',
        sending: '⏳ Отправка...',
        sent: '✅ Отправлено!',
        wait: (s) => `⏳ Жди ещё ${s} сек`,
        probFile: '⬇️ Файл проблемный, качаю на ПК...',
        savedPc: '✅ Скачано на ПК!',
        err: '❌ Ошибка',
        noMedia: '❌ Медиа не найдено',
        downloading: '⏳ Загрузка...',
        canceled: '❌ Отменено',
        downingActive: '✅ Скачивается!',
        noCreds: '❌ Укажи ключи в ⚙️'
    },
    en: {
        banner: '🟢 better34 active',
        saved: '✅ Already in collection',
        sendTg: '⬆️ Send to TG',
        downPc: '💾 Save to PC',
        fitIn: '🔍 Fit to screen',
        fitOut: '🔎 Reset size',
        back: '⬅️ Back',
        boringTxt: 'trash author leave',
        hide: 'Hide',
        sending: '⏳ Sending...',
        sent: '✅ Sent!',
        wait: (s) => `⏳ Wait ${s} sec`,
        probFile: '⬇️ Problem file, saving to PC...',
        savedPc: '✅ Saved to PC!',
        err: '❌ Error',
        noMedia: '❌ Media not found',
        downloading: '⏳ Downloading...',
        canceled: '❌ Canceled',
        downingActive: '✅ Downloading!',
        noCreds: '❌ Setup keys in ⚙️'
    }
};

window.addEventListener('pageshow', (event) => {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        chrome.storage.local.get(['extEnabled', 'savedPosts', 'viewedPosts'], (data) => {
            if (data.extEnabled === false) return;
            markThumbnails(data.savedPosts || {}, data.viewedPosts || {});
        });
    }
});

chrome.storage.local.get(['extEnabled', 'autoResizeEnabled', 'savedPosts', 'viewedPosts', 'extLang'], (data) => {
    if (data.extEnabled === false) return; 
    
    const savedPosts = data.savedPosts || {};
    const viewedPosts = data.viewedPosts || {};
    const lang = data.extLang || 'ru'; 

    addStatusBanner(lang);
    markThumbnails(savedPosts, viewedPosts);

    const urlParams = new URLSearchParams(window.location.search);
    const isPostPage = urlParams.get('page') === 'post' && urlParams.get('s') === 'view' && urlParams.has('id');
    
    if (isPostPage) {
        const currentPostId = urlParams.get('id');
        if (currentPostId && !viewedPosts[currentPostId]) {
            viewedPosts[currentPostId] = true;
            chrome.storage.local.set({ viewedPosts: viewedPosts });
        }
        addButtons(data.autoResizeEnabled || false, savedPosts, currentPostId, lang);
    }
});

function addStatusBanner(lang) {
    if (document.querySelector('#r34-ext-status')) return;
    const statusDiv = document.createElement('div');
    statusDiv.id = 'r34-ext-status';
    statusDiv.innerHTML = t[lang].banner;
    statusDiv.style = 'background-color: #27ae60; color: white; text-align: center; padding: 5px; font-weight: bold; font-size: 14px; width: 100%; border-bottom: 2px solid #1e8449; box-sizing: border-box;';
    document.body.insertBefore(statusDiv, document.body.firstChild);
}

function markThumbnails(savedPosts, viewedPosts) {
    const thumbs = document.querySelectorAll('.thumb a');
    thumbs.forEach(link => {
        try {
            const url = new URL(link.href, window.location.origin);
            const id = url.searchParams.get('id');
            if (id) {
                const isSaved = savedPosts[id];
                const isViewed = viewedPosts[id];
                if (isSaved || isViewed) {
                    let marker = link.querySelector('.r34-ext-marker');
                    if (!marker) {
                        link.style.position = 'relative';
                        link.style.display = 'inline-block';
                        marker = document.createElement('div');
                        marker.className = 'r34-ext-marker';
                        link.appendChild(marker);
                    }
                    if (isSaved) {
                        marker.innerHTML = '✅';
                        marker.style = 'position: absolute; top: 5px; left: 5px; font-size: 14px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; pointer-events: none; z-index: 10; line-height: 1;';
                    } else if (isViewed) {
                        marker.innerHTML = '👁️';
                        marker.style = 'position: absolute; top: 5px; left: 5px; font-size: 14px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 3px; pointer-events: none; z-index: 10; line-height: 1; opacity: 0.8;';
                    }
                }
            }
        } catch (e) {}
    });
}

function addButtons(isAutoResized, savedPosts, currentPostId, lang) {
    const sidebar = document.querySelector('.sidebar') || document.querySelector('#tag-sidebar');
    if (!sidebar || document.querySelector('#send-to-tg-btn')) return;

    const isAlreadySaved = savedPosts[currentPostId] === true;
    const savedBadgeHtml = isAlreadySaved ? `<div style="background-color: #27ae60; color: white; padding: 6px; border-radius: 5px; text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 10px; border: 1px solid #1e8449;">${t[lang].saved}</div>` : '';

    const btnContainer = document.createElement('div');
    btnContainer.innerHTML = `
        ${savedBadgeHtml}
        <a href="#" id="send-to-tg-btn" style="background-color: #0088cc; color: white; padding: 8px 12px; border-radius: 5px; text-decoration: none; display: block; margin-top: 10px; margin-bottom: 5px; font-weight: bold; text-align: center;">
            ${t[lang].sendTg}
        </a>
        <a href="#" id="download-pc-btn" style="background-color: #8e44ad; color: white; padding: 8px 12px; border-radius: 5px; text-decoration: none; display: block; margin-bottom: 5px; font-weight: bold; text-align: center;">
            ${t[lang].downPc}
        </a>
        <a href="#" id="resize-img-btn" style="background-color: #e67e22; color: white; padding: 8px 12px; border-radius: 5px; text-decoration: none; display: block; margin-bottom: 5px; font-weight: bold; text-align: center;">
            ${t[lang].fitIn}
        </a>
        <a href="#" id="go-back-btn" style="background-color: #34495e; color: white; padding: 8px 12px; border-radius: 5px; text-decoration: none; display: block; margin-bottom: 15px; font-weight: bold; text-align: center;">
            ${t[lang].back}
        </a>
    `;

    sidebar.insertBefore(btnContainer, sidebar.firstChild);

    function forceBackAndRefresh() {
        if (document.referrer && document.referrer.includes('rule34.xxx')) {
            window.location.href = document.referrer; 
        } else {
            window.history.back();
        }
    }

    function getMediaUrl() {
        let mediaUrl = null;
        const statsLinks = document.querySelectorAll('a');
        for (let link of statsLinks) {
            if (link.textContent.includes('Original image') || link.textContent.includes('Download')) {
                mediaUrl = link.href; break;
            }
        }
        if (!mediaUrl) {
            const videoSource = document.querySelector('video source') || document.querySelector('video');
            if (videoSource) mediaUrl = videoSource.src;
        }
        if (!mediaUrl) {
            const mainImg = document.querySelector('#image');
            if (mainImg) mediaUrl = mainImg.src;
        }
        return mediaUrl;
    }

    function getArtistTags() {
        const artistElements = document.querySelectorAll('.tag-type-artist');
        let tags = [];
        artistElements.forEach(el => {
            const links = el.querySelectorAll('a');
            for (let link of links) {
                if (link.href.includes('&tags=')) {
                    let tagName = link.textContent.trim();
                    tagName = tagName.replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, '_'); 
                    tagName = tagName.replace(/_+/g, '_');
                    tags.push('#' + tagName);
                    break;
                }
            }
        });
        return tags.length > 0 ? tags.join(' ') : '#Rule34';
    }

    const currentArtistTags = getArtistTags();

    if (currentArtistTags !== '#Rule34') { 
        chrome.storage.local.get(['trackedArtist', 'artistViewCount', 'artistDownloaded'], (data) => {
            let trackedArtist = data.trackedArtist || '';
            let viewCount = data.artistViewCount || 0;
            let hasDownloaded = data.artistDownloaded || false;

            if (trackedArtist !== currentArtistTags) {
                chrome.storage.local.set({ trackedArtist: currentArtistTags, artistViewCount: 1, artistDownloaded: false });
            } else {
                if (!hasDownloaded) {
                    viewCount++;
                    chrome.storage.local.set({ artistViewCount: viewCount });
                    if (viewCount === 5) showBoringArtistWarning(lang);
                }
            }
        });
    }

    function markAsDownloadedAndSaved() {
        chrome.storage.local.get(['savedPosts'], (data) => {
            let db = data.savedPosts || {};
            if (currentPostId) db[currentPostId] = true; 
            chrome.storage.local.set({ artistDownloaded: true, savedPosts: db });
        });
    }

    function showBoringArtistWarning(l) {
        const warnDiv = document.createElement('div');
        warnDiv.innerHTML = `
            <div style="background-color: #2c3e50; color: white; padding: 12px; border-radius: 5px; margin-top: 15px; margin-bottom: 5px; text-align: center; border: 2px solid #e74c3c;">
                <b style="color: #e74c3c; font-size: 16px; display: block; margin-bottom: 10px;">${t[l].boringTxt}</b>
                <button id="hide-warning-btn" style="width: 100%; background-color: #e74c3c; border: none; color: white; padding: 6px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 12px;">${t[l].hide}</button>
            </div>
        `;
        sidebar.insertBefore(warnDiv, btnContainer);

        document.getElementById('hide-warning-btn').addEventListener('click', (e) => {
            e.preventDefault();
            warnDiv.remove();
        });
    }

    document.getElementById('go-back-btn').addEventListener('click', (e) => {
        e.preventDefault();
        forceBackAndRefresh(); 
    });

    document.getElementById('send-to-tg-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const btn = document.getElementById('send-to-tg-btn');
        if (btn.dataset.blocked === 'true') return;

        btn.dataset.blocked = 'true';
        btn.innerHTML = t[lang].sending;
        btn.style.backgroundColor = '#f39c12';

        const mediaUrl = getMediaUrl();
        const captionText = currentArtistTags;

        if (mediaUrl) {
            chrome.runtime.sendMessage({action: "sendMedia", url: mediaUrl, caption: captionText}, (response) => {
                if (response && response.status === 'success') {
                    btn.innerHTML = t[lang].sent;
                    btn.style.backgroundColor = '#27ae60';
                    markAsDownloadedAndSaved(); 
                    setTimeout(() => { forceBackAndRefresh(); }, 1000);
                } else {
                    const errorText = response.error ? response.error.toLowerCase() : '';
                    
                    if (errorText.includes('no_credentials')) {
                        btn.innerHTML = t[lang].noCreds;
                        btn.style.backgroundColor = '#c0392b';
                        setTimeout(() => {
                            btn.innerHTML = t[lang].sendTg;
                            btn.style.backgroundColor = '#0088cc';
                            btn.dataset.blocked = 'false'; 
                        }, 3000);
                    } else if (errorText.includes('флуд-контроль')) {
                        let seconds = parseInt(response.error.split(':')[1].trim());
                        btn.style.backgroundColor = '#d35400';
                        btn.innerHTML = t[lang].wait(seconds);
                        const timerInterval = setInterval(() => {
                            seconds--;
                            if (seconds > 0) {
                                btn.innerHTML = t[lang].wait(seconds);
                            } else {
                                clearInterval(timerInterval);
                                btn.innerHTML = t[lang].sendTg;
                                btn.style.backgroundColor = '#0088cc';
                                btn.dataset.blocked = 'false'; 
                            }
                        }, 1000);
                    } else if (errorText.includes('too big') || errorText.includes('request entity too large') || errorText.includes('invalid_dimensions')) {
                        btn.innerHTML = t[lang].probFile;
                        btn.style.backgroundColor = '#8e44ad';
                        chrome.runtime.sendMessage({action: "downloadMedia", url: mediaUrl}, (dlResponse) => {
                            setTimeout(() => {
                                btn.innerHTML = t[lang].savedPc;
                                btn.style.backgroundColor = '#27ae60';
                                markAsDownloadedAndSaved(); 
                                setTimeout(() => { forceBackAndRefresh(); }, 1000);
                            }, 1000);
                        });
                    } else {
                        btn.innerHTML = t[lang].err;
                        btn.style.backgroundColor = '#c0392b';
                        setTimeout(() => {
                            btn.innerHTML = t[lang].sendTg;
                            btn.style.backgroundColor = '#0088cc';
                            btn.dataset.blocked = 'false'; 
                        }, 3000);
                    }
                }
            });
        } else {
            btn.innerHTML = t[lang].noMedia;
            btn.style.backgroundColor = '#c0392b';
            setTimeout(() => {
                btn.innerHTML = t[lang].sendTg;
                btn.style.backgroundColor = '#0088cc';
                btn.dataset.blocked = 'false'; 
            }, 3000);
        }
    });

    document.getElementById('download-pc-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const btn = document.getElementById('download-pc-btn');
        if (btn.dataset.blocked === 'true') return;
        
        btn.dataset.blocked = 'true';
        btn.innerHTML = t[lang].downloading;
        btn.style.backgroundColor = '#f39c12';

        const mediaUrl = getMediaUrl();

        if (mediaUrl) {
            chrome.runtime.sendMessage({action: "downloadMedia", url: mediaUrl}, (response) => {
                if (response && response.error && response.error.toLowerCase().includes('canceled')) {
                    btn.innerHTML = t[lang].canceled;
                    btn.style.backgroundColor = '#c0392b';
                    setTimeout(() => {
                        btn.innerHTML = t[lang].downPc;
                        btn.style.backgroundColor = '#8e44ad';
                        btn.dataset.blocked = 'false';
                    }, 2000);
                } else {
                    btn.innerHTML = t[lang].downingActive;
                    btn.style.backgroundColor = '#27ae60';
                    markAsDownloadedAndSaved(); 
                    setTimeout(() => { forceBackAndRefresh(); }, 1000);
                }
            });
        } else {
            btn.innerHTML = t[lang].noMedia;
            btn.style.backgroundColor = '#c0392b';
            setTimeout(() => {
                btn.innerHTML = t[lang].downPc;
                btn.style.backgroundColor = '#8e44ad';
                btn.dataset.blocked = 'false';
            }, 2000);
        }
    });

    const mediaElement = document.querySelector('#image') || document.querySelector('video');
    const resizeBtn = document.getElementById('resize-img-btn');
    let currentResizeState = isAutoResized;

    function applyResizeStyles(shouldResize) {
        if (!mediaElement) return;
        if (shouldResize) {
            mediaElement.style.maxWidth = '100%';
            mediaElement.style.maxHeight = '90vh';
            mediaElement.style.objectFit = 'contain';
            mediaElement.style.width = 'auto';
            mediaElement.style.height = 'auto';
            resizeBtn.innerHTML = t[lang].fitOut;
        } else {
            mediaElement.style.maxWidth = '';
            mediaElement.style.maxHeight = '';
            mediaElement.style.objectFit = '';
            mediaElement.style.width = '';
            mediaElement.style.height = '';
            resizeBtn.innerHTML = t[lang].fitIn;
        }
    }

    if (currentResizeState) applyResizeStyles(true);

    resizeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!mediaElement) {
            resizeBtn.innerHTML = t[lang].err;
            setTimeout(() => { applyResizeStyles(currentResizeState); }, 2000);
            return;
        }

        currentResizeState = !currentResizeState;
        applyResizeStyles(currentResizeState);
        chrome.storage.local.set({ autoResizeEnabled: currentResizeState });

        if (currentResizeState) {
            mediaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}