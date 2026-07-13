#!/bin/bash
echo "🚀 Startuji deployment Chlivek Achievements..."

cd /var/www/chlivek.fredrik.cz

echo "📥 Stahuji aktualni kod z GitHubu..."
git pull

echo "📦 Instaluji zavislosti..."
npm install

echo "💾 Zalohuji databazi..."
npm run backup

echo "🗃️ Aplikuji migrace databaze..."
npx prisma migrate deploy

echo "🏗️ Buildim aplikaci (Next.js)..."
npm run build

echo "🔄 Restartuji PM2 proces..."
pm2 restart chlivek-achievements

echo "✅ Hotovo! Aplikace bezi v nove verzi."
