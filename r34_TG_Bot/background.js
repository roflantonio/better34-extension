chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sendMedia" && request.url) {
        sendMediaToTelegram(request.url, request.caption)
            .then(() => {
                incrementStat('sentCount');
                sendResponse({status: 'success'});
            })
            .catch((error) => {
                const errorMsg = error.message.toLowerCase();
                const isSpam = errorMsg.includes('флуд-контроль') || errorMsg.includes('too many requests');
                const isTooBig = errorMsg.includes('too big') || errorMsg.includes('request entity too large');
                const isInvalidDimensions = errorMsg.includes('invalid_dimensions');
                
                // Специальную ошибку "нет токена" тоже не пишем в лог, она для UI
                if (!isSpam && !isTooBig && !isInvalidDimensions && !errorMsg.includes('no_credentials')) {
                    logError(`ТГК: ${error.message}`);
                }
                
                sendResponse({status: 'error', error: error.message});
            });
        return true; 
    }

    if (request.action === "downloadMedia" && request.url) {
        chrome.downloads.download({
            url: request.url,
            conflictAction: 'uniquify'
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                 const errorMsg = chrome.runtime.lastError.message.toLowerCase();
                 if (!errorMsg.includes('canceled')) {
                     logError(`ПК: ${chrome.runtime.lastError.message}`);
                 }
                 sendResponse({status: 'error', error: chrome.runtime.lastError.message});
            } else {
                 incrementStat('downloadCount');
                 sendResponse({status: 'success', downloadId: downloadId});
            }
        });
        return true; 
    }
});

function incrementStat(key) {
    chrome.storage.local.get([key], (data) => {
        const current = data[key] || 0;
        chrome.storage.local.set({ [key]: current + 1 });
    });
}

function logError(message) {
    chrome.storage.local.get(['errorLog'], (data) => {
        let logs = data.errorLog || [];
        const time = new Date().toLocaleTimeString('ru-RU');
        logs.unshift(`[${time}] ${message}`);
        if (logs.length > 10) logs = logs.slice(0, 10);
        chrome.storage.local.set({ errorLog: logs });
    });
}

// Получение ключей из хранилища (в виде промиса для удобства)
function getCredentials() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['botToken', 'chatId'], (data) => {
            resolve({ token: data.botToken, chat: data.chatId });
        });
    });
}

async function sendMediaToTelegram(mediaUrl, captionText) {
    // 1. Получаем токены пользователя
    const creds = await getCredentials();
    if (!creds.token || !creds.chat) {
        throw new Error('NO_CREDENTIALS'); // Специальный триггер для контент-скрипта
    }

    const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.webm');
    const isGif = mediaUrl.includes('.gif');

    let apiMethod = 'sendPhoto';
    let mediaField = 'photo';

    if (isVideo) {
        apiMethod = 'sendVideo';
        mediaField = 'video';
    } else if (isGif) {
        apiMethod = 'sendAnimation';
        mediaField = 'animation';
    }

    const apiUrl = `https://api.telegram.org/bot${creds.token}/${apiMethod}`;

    try {
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) throw new Error('Не удалось скачать файл с сайта');
        const mediaBlob = await mediaResponse.blob();

        let fileName = mediaUrl.split('/').pop().split('?')[0];
        if (!fileName) {
            if (isVideo) fileName = 'video.mp4';
            else if (isGif) fileName = 'animation.gif';
            else fileName = 'image.jpg';
        }

        const formData = new FormData();
        formData.append('chat_id', creds.chat);
        formData.append(mediaField, mediaBlob, fileName);
        
        if (captionText) formData.append('caption', captionText);

        const telegramResponse = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });

        const result = await telegramResponse.json();

        if (!result.ok) {
            if (result.error_code === 429) {
                const waitTime = result.parameters?.retry_after || result.description.match(/\d+/)[0] || 15;
                throw new Error(`Флуд-контроль: ${waitTime}`);
            }
            throw new Error(`Отклонено Telegram: ${result.description}`);
        }

        return true;
    } catch (error) {
        throw error;
    }
}