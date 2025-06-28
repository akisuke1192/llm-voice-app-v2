document.addEventListener('DOMContentLoaded', function() {
    const socket = io(); // Socket.IO接続を初期化

    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');

    function appendMessage(sender, message) {
        const msgDiv = document.createElement('div');
        msgDiv.style.marginBottom = '8px';
        msgDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        appendMessage('あなた', text);
        userInput.value = '';
        socket.emit('user_message', { message: text }); // サーバーにメッセージを送信
    }

    sendButton.addEventListener('click', sendMessage);

    // Enterキーで送信（Shift+Enterで改行）
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    let currentAiMessageElement = null;
    let fullAiResponse = '';

    // サーバーからのAIの応答を処理 (エラー時)
    socket.on('ai_response', function(data) {
        appendMessage('AI', data.response);
    });

    // ストリーミングされたAIの応答の断片を処理
    socket.on('ai_response_chunk', function(data) {
        if (!currentAiMessageElement) {
            const msgDiv = document.createElement('div');
            msgDiv.style.marginBottom = '8px';
            msgDiv.innerHTML = `<strong>AI:</strong> `;
            currentAiMessageElement = msgDiv;
            chatBox.appendChild(currentAiMessageElement);
        }
        fullAiResponse += data.response;
        currentAiMessageElement.innerHTML += data.response; // テキストを追記
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // ストリーミング終了時の処理
    socket.on('ai_stream_end', function() {
        if ('speechSynthesis' in window && fullAiResponse) {
            const utter = new SpeechSynthesisUtterance(fullAiResponse);
            utter.lang = 'ja-JP';
            window.speechSynthesis.speak(utter);
        }
        currentAiMessageElement = null; // リセット
        fullAiResponse = ''; // リセット
    });

    // 音声認識機能
    let recognition;
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.continuous = false;

        micButton.addEventListener('click', function() {
            recognition.start();
            micButton.disabled = true;
            micButton.textContent = '🎤...';
        });

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            micButton.disabled = false;
            micButton.textContent = '🎤';
        };
        recognition.onerror = function() {
            micButton.disabled = false;
            micButton.textContent = '🎤';
        };
        recognition.onend = function() {
            micButton.disabled = false;
            micButton.textContent = '🎤';
        };
    } else {
        micButton.disabled = true;
        micButton.title = 'このブラウザは音声認識に対応していません';
    }
}); 