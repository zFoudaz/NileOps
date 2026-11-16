#!/bin/sh
set -e

echo "[NileOps] Waiting for PostgreSQL database to be reachable..."
until python -c "
import sys, psycopg2, os
from urllib.parse import urlparse
db_url = os.environ.get('DATABASE_URL', '')
if not db_url:
    sys.exit(0)
res = urlparse(db_url)
try:
    conn = psycopg2.connect(
        dbname=res.path.lstrip('/'),
        user=res.username,
        password=res.password,
        host=res.hostname,
        port=res.port or 5432
    )
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
  echo "[NileOps] Database is not ready yet - retrying in 1s..."
  sleep 1
done

echo "[NileOps] Database connected successfully!"

echo "[NileOps] Applying database migrations via Alembic..."
alembic upgrade head

echo "[NileOps] Seeding initial employee account..."
python seed_employee.py \
  --email "${DEFAULT_EMPLOYEE_EMAIL:-employee@nileops.com}" \
  --password "${DEFAULT_EMPLOYEE_PASSWORD:-EmployeePass123!}" \
  --name "${DEFAULT_EMPLOYEE_NAME:-أحمد فؤاد}" || true

echo "[NileOps] Launching Uvicorn server on http://0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
