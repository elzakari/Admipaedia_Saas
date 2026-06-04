import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.celery_app import celery_app

if __name__ == '__main__':
    celery_app.worker_main(['worker', '--loglevel=info'])