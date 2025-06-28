from flask import Flask, render_template, request, jsonify
import os
from dotenv import load_dotenv
import google.generativeai as genai
from flask_socketio import SocketIO, emit

load_dotenv()

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data.get('message', '')
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        return jsonify({'response': 'APIキーが設定されていません'}), 500
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('models/gemini-1.5-flash')
    try:
        response = model.generate_content(user_message)
        ai_message = response.text
    except Exception as e:
        ai_message = f'エラーが発生しました: {e}'
    return jsonify({'response': ai_message})

# Socket.IOイベント
@socketio.on('connect')
def handle_connect():
    print('クライアントが接続しました')

@socketio.on('user_message')
def handle_user_message(data):
    user_message = data.get('message', '')
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        emit('ai_response', {'response': 'APIキーが設定されていません'})
        return
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('models/gemini-1.5-flash')
    try:
        response_stream = model.generate_content(user_message, stream=True)
        for chunk in response_stream:
            if chunk.text:
                emit('ai_response_chunk', {'response': chunk.text})
        emit('ai_stream_end')
    except Exception as e:
        ai_message = f'エラーが発生しました: {e}'
        emit('ai_response', {'response': ai_message})

if __name__ == '__main__':
    socketio.run(app, debug=True)

# Render.com Start Command (for production):
# gunicorn -k geventwebsocket.gunicorn.workers.GeventWebSocketWorker -w 1 app:app 