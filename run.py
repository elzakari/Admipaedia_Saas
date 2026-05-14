import sys
import os

from dotenv import load_dotenv
load_dotenv()

# Add backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
