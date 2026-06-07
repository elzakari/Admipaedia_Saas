import os
print("DATABASE_URL:", os.environ.get('DATABASE_URL'))
for k, v in os.environ.items():
    if k.startswith('PG') or 'DATABASE' in k:
        print(f"{k}: {v}")
