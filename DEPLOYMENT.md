# Deployment Guide

This project is now set up for production deployment with Docker Compose and Caddy for automatic HTTPS.

## Production architecture

- `front-end`: built static frontend served by Nginx inside the frontend container
- `backend`: Node.js API
- `ml-service`: FastAPI service
- `mongo`: MongoDB
- `qdrant`: Qdrant vector database
- `caddy`: public reverse proxy for HTTP and HTTPS

Caddy terminates TLS and routes traffic to the frontend container. The frontend then proxies `/api/*` requests to the backend.

## Files used for deployment

- `compose.prod.yaml`
- `deploy/Caddyfile`
- `backend/.env.production`

## 1. Prepare your server

Use a Linux VM with at least:

- `4 vCPU`
- `8 GB RAM`

Install Docker and Docker Compose:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

## 2. Point your domain to the server

Create an `A` record for your domain, for example:

- `your-domain.com -> <server-ip>`

If you want `www`, also create:

- `www.your-domain.com -> <server-ip>`

Wait until DNS resolves correctly before starting Caddy.

## 3. Copy the project to the server

```bash
git clone <your-repo-url>
cd cctv-4-2-project
```

## 4. Create the backend production env file

```bash
cp backend/.env.production.example backend/.env.production
```

Edit `backend/.env.production`:

```env
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=https://your-domain.com
```

## 5. Create a root `.env` file for Compose

Create a file named `.env` in the project root:

```env
DOMAIN=your-domain.com
```

This value is used by Caddy in `compose.prod.yaml`.

## 6. Start the production stack

```bash
docker compose -f compose.prod.yaml up -d --build
```

## 7. Open the application

After Caddy provisions the certificate, open:

```text
https://your-domain.com
```

## 8. Useful commands

See container status:

```bash
docker compose -f compose.prod.yaml ps
```

See logs:

```bash
docker compose -f compose.prod.yaml logs -f
```

See only Caddy logs:

```bash
docker compose -f compose.prod.yaml logs -f caddy
```

Restart after updates:

```bash
docker compose -f compose.prod.yaml up -d --build
```

Stop:

```bash
docker compose -f compose.prod.yaml down
```

## Notes

- uploaded files are stored in the `shared_uploads` volume
- MongoDB data is stored in `mongo_data`
- Qdrant data is stored in `qdrant_data`
- Caddy certificate data is stored in `caddy_data`
- frontend API calls use same-origin `/api` in production

## Troubleshooting

If HTTPS does not come up:

- make sure the domain points to the server IP
- make sure ports `80` and `443` are open in the server firewall
- check Caddy logs:

```bash
docker compose -f compose.prod.yaml logs -f caddy
```
