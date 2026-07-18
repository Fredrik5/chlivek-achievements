#!/bin/bash
echo "🚀 Startuji deployment Chlivek Achievements..."

cd /var/www/chlivek.fredrik.cz

echo "📥 Stahuji aktualni kod z GitHubu..."
git pull

echo "📦 Instaluji zavislosti..."
npm install

echo "💾 Zalohuji databazi..."
npm run backup

echo "⏸️ Zastavuji PM2 proces (aby migrace nebezela proti zivym zapisum)..."
pm2 stop chlivek-achievements

echo "🗃️ Aplikuji migrace databaze..."
npx prisma migrate deploy

echo "🏗️ Buildim aplikaci (Next.js)..."
npm run build

echo "▶️ Startuji PM2 proces..."
pm2 start chlivek-achievements

echo "✅ Hotovo! Aplikace bezi v nove verzi."
