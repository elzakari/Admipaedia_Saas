# Secrets Management

## Do Not Commit Secrets
- `.env` files containing credentials must not be committed.
- Use environment variables in CI/CD and production.

## Environment Files
- Provide `.env.example` with placeholders for local setup.
- Actual `.env` files should be ignored by Git.

## Rotation
- Rotate any committed credentials immediately (database, email, JWT keys).

## Storage
- Prefer a secrets manager (e.g., GitHub Actions secrets, cloud provider KMS/Secrets Manager).

## Validation in CI
- Add secret scanners to CI to block accidental commits.

## Configuration
- Backend reads `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY`, `REDIS_URL` from environment.
