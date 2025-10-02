// 语音识别模块（渲染进程）
// 使用浏览器 Web Speech API（webkitSpeechRecognition）实现本地ASR
// 在Electron中需在渲染进程运行，结果通过IPC发送到主进程打印

(function() {
    let recognition = null;
    let isActive = false;
    let isSupported = false;
    let ipcRenderer = null;

    try {
        if (typeof require !== 'undefined') {
            ipcRenderer = require('electron').ipcRenderer;
        }
    } catch (_) {
        ipcRenderer = null;
    }

    function sendAsrText(text, isFinal = true) {
        if (!ipcRenderer) return;
        try {
            ipcRenderer.send('voice-asr-text', { text, isFinal });
        } catch (_) {}
    }

    function setupRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('当前环境不支持 Web Speech API 语音识别');
            isSupported = false;
            return;
        }
        isSupported = true;

        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.interimResults = true; // 启用中间结果
        recognition.continuous = true; // 持续识别

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            if (interimTranscript) {
                sendAsrText(interimTranscript, false);
            }
            if (finalTranscript) {
                sendAsrText(finalTranscript, true);
                // 触发宠物显示一个简短提示
                try {
                    if (window.showNotification) {
                        window.showNotification(`🎤 ${finalTranscript}`, 2500);
                    }
                } catch (_) {}
            }
        };

        recognition.onerror = (e) => {
            console.warn('SpeechRecognition 错误:', e.error || e);
            // 某些错误下尝试自动重启
            if (isActive && (e.error === 'no-speech' || e.error === 'aborted' || e.error === 'network')) {
                restart();
            }
        };

        recognition.onend = () => {
            if (isActive) {
                // 在活动状态下自动重启，确保持续监听
                restart();
            }
        };
    }

    function start() {
        if (!isSupported) setupRecognition();
        if (!isSupported || !recognition) {
            try { window.showNotification && window.showNotification('❗ 当前环境不支持语音识别'); } catch(_) {}
            return false;
        }
        if (isActive) return true;
        isActive = true;
        try {
            recognition.start();
            window.showNotification && window.showNotification('🎧 语音交互模式：已开启');
        } catch (e) {
            console.warn('启动语音识别失败:', e?.message || e);
            isActive = false;
            return false;
        }
        return true;
    }

    function stop() {
        if (!recognition) return;
        isActive = false;
        try {
            recognition.stop();
            window.showNotification && window.showNotification('🛑 语音交互模式：已关闭');
        } catch (_) {}
    }

    function restart() {
        try {
            recognition.stop();
        } catch (_) {}
        setTimeout(() => {
            try { recognition.start(); } catch(_) {}
        }, 150);
    }

    // 暴露全局切换函数供菜单调用
    window.voiceInteraction = {
        start,
        stop,
        toggle() {
            if (isActive) { stop(); } else { start(); }
        },
        isActive: () => isActive
    };
})();


