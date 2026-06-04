import os
import gevent.monkey
gevent.monkey.patch_all()

from app import create_app

config_name = os.environ.get('FLASK_ENV', 'production')
app = create_app(config_name)
