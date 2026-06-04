import eventlet
eventlet.monkey_patch()

import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app, socketio

config_name = os.environ.get('FLASK_ENV', 'production')
app = create_app(config_name)

if __name__ == '__main__':
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    print(f"Starting isolated eventlet Socket.IO server on {host}:{port}")
    socketio.run(app, host=host, port=port, use_reloader=False)
