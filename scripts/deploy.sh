#!/bin/bash
# AWS EC2 pe deploy karne ke liye

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ── Config — apni values daal ───────────────────
EC2_USER="ubuntu"
EC2_HOST="${EC2_HOST:-""}"          # ya seedha: "1.2.3.4"
EC2_KEY="${EC2_KEY:-"~/.ssh/collab-key.pem"}"
REMOTE_DIR="/home/ubuntu/realtime-collab"

echo -e "${YELLOW}🚀 Deploying to AWS EC2...${NC}"

# ── EC2 host check ───────────────────────────────
if [ -z "$EC2_HOST" ]; then
  echo -e "${RED}✗  EC2_HOST set nahi hai${NC}"
  echo "   Export karo: export EC2_HOST=your-ec2-ip"
  exit 1
fi

echo -e "${GREEN}→  Target: $EC2_USER@$EC2_HOST${NC}"

# ── Step 1: Code push karo ───────────────────────
echo -e "\n${YELLOW}[1/4] Code copy kar raha hu EC2 pe...${NC}"
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'dist' \
  -e "ssh -i $EC2_KEY -o StrictHostKeyChecking=no" \
  . "$EC2_USER@$EC2_HOST:$REMOTE_DIR"

echo -e "${GREEN}✓  Code pushed!${NC}"

# ── Step 2: .env push karo ───────────────────────
echo -e "\n${YELLOW}[2/4] Environment variables push kar raha hu...${NC}"
scp -i "$EC2_KEY" \
  -o StrictHostKeyChecking=no \
  .env.production \
  "$EC2_USER@$EC2_HOST:$REMOTE_DIR/.env"

echo -e "${GREEN}✓  .env pushed!${NC}"

# ── Step 3: EC2 pe commands chalao ───────────────
echo -e "\n${YELLOW}[3/4] EC2 pe deploy kar raha hu...${NC}"
ssh -i "$EC2_KEY" \
  -o StrictHostKeyChecking=no \
  "$EC2_USER@$EC2_HOST" << 'ENDSSH'

  cd /home/ubuntu/realtime-collab

  echo "Docker Compose pull + restart..."
  docker compose pull 2>/dev/null || true
  docker compose up --build -d

  echo "Old images cleanup..."
  docker image prune -f

  echo "Deploy complete!"
ENDSSH

echo -e "${GREEN}✓  EC2 deploy done!${NC}"

# ── Step 4: Health check ─────────────────────────
echo -e "\n${YELLOW}[4/4] Health check...${NC}"
sleep 10  # Services start hone do

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://$EC2_HOST/nginx-health" || echo "000")

if [ "$STATUS" = "200" ]; then
  echo -e "${GREEN}✓  Deploy successful!${NC}"
  echo ""
  echo "  Live URL → http://$EC2_HOST"
else
  echo -e "${RED}✗  Health check failed (status: $STATUS)${NC}"
  echo "   Logs dekho: ssh -i $EC2_KEY $EC2_USER@$EC2_HOST 'cd $REMOTE_DIR && docker compose logs'"
  exit 1
fi