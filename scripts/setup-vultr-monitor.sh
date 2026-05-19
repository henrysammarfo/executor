#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y curl
fi

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env. Set API_URL, CRON_SECRET, and MONITOR_CRON before starting PM2."
fi

npm install --no-audit --no-fund

echo "Ready. Start with:"
echo "  pm2 start \"npm run monitor\" --name executor-monitor"
echo "  pm2 save"
echo "  pm2 startup"
