# Vishnu PCM Classes Admin

## Configure admin login

The admin login needs `ADMIN_EMAIL` and `ADMIN_PASSWORD`. No default credentials
are provided.

For local development, copy `.env.example` to `.env` and replace both values
with your own credentials. The app loads `.env` from this directory when it
starts. Restart the app after changing the file.

For deployment, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` as environment variables
in the hosting provider's settings, then redeploy or restart the service. Do not
commit `.env` or put real credentials in source files.

Install dependencies and run the API from this directory:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
