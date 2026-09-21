# Free TableTrail deployment

One free Render web service runs the Next.js site and the Express API together. One free Aiven MySQL service stores the database. The browser uses same-origin `/api` requests, as it does locally.

## 1. Create free MySQL

Create an Aiven for MySQL service on the **Free** plan. Aiven provides one free MySQL instance with 1 GB storage; it can power off after prolonged inactivity. In Aiven's **Connect** section, note its host, port, username (`avnadmin`) and password, and download its CA certificate. Do not commit these values or the certificate.

Create no tables in the Aiven console. On your computer, copy `backend/.env.example` to `backend/.env.cloud` and fill in the Aiven host, port, username and password, `DB_NAME=tabletrail`, a **new** random `JWT_SECRET`, and a **new** `DEMO_PASSWORD`. Keep this file private. The `.env.cloud` file is Git-ignored; do not share or commit it.

Download Aiven's CA certificate. Convert it to a single environment value with:

```bash
base64 -i /path/to/ca.pem | tr -d '\n'
```

Put the result after `DB_CA_BASE64=` in `backend/.env.cloud`. Then run `npm run db:setup:cloud`. This script loads only your cloud settings and refuses to replace an existing database. Your local `backend/.env` stays untouched. The cloud database gets a new demo password you choose.

If Aiven rejects a stored routine, check its service settings and user grants before proceeding. TableTrail needs `CREATE ROUTINE`, `CREATE VIEW`, `TRIGGER`, and `EXECUTE` privileges.

## 2. Deploy one Render service

In Render, choose **New → Blueprint** and connect the `tabletrail-dbms` GitHub repository. The checked-in `render.yaml` configures one **Free** Node web service. Supply the required environment variables when prompted:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Aiven connection values.
- `DB_CA_BASE64`: The encoded Aiven CA certificate.
- `JWT_SECRET`: The new secret from your cloud setup file.
- `APP_ORIGIN`: The final `https://…onrender.com` address of this Render service, with no trailing slash.

`NODE_ENV=production` is already configured. No database password belongs in `render.yaml`. If Render assigns a different public URL than expected, update `APP_ORIGIN` to match it and redeploy. `API_URL` is unnecessary because Express runs on loopback inside the same Render service.

Visit `<your-render-url>/api/health`; it should return `{"status":"ok"}`. Then sign in at your Render URL with `admin@tabletrail.test` and the **cloud** `DEMO_PASSWORD` used to seed Aiven. The local password may differ.

## Free-tier behavior

Render's free service sleeps after 15 minutes without traffic; its first wakeup can take about a minute. Aiven may pause an unused free database and require you to power it on again. Render's free filesystem is temporary, so the database lives on Aiven. This is suitable for a college demo, not a production restaurant. Check each provider's current usage limits before adding a payment method.
