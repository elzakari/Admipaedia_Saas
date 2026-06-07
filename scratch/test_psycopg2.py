import psycopg2
import sys

print("Python version:", sys.version)
print("Psycopg2 version:", psycopg2.__version__)

try:
    print("Attempting direct connection...")
    conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/admipaedia")
    print("Connection successful!")
    conn.close()
except Exception as e:
    print("Failed with exception type:", type(e))
    print("Failed with error:", e)
    import traceback
    traceback.print_exc()
