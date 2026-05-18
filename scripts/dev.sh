

set -e 

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' 

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║   Realtime Collab Platform — DEV     ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠  .env file nahi mili — .env.example se bana raha hu...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✓  .env bana di — JWT_SECRET zaroor set karo!${NC}"
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗  Docker nahi mila — pehle install karo${NC}"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo -e "${RED}✗  Docker daemon nahi chal raha — start karo${NC}"
  exit 1
fi

ACTION=${1:-"up"}  

case $ACTION in

  "up")
    echo -e "${GREEN}▶  Starting all services...${NC}"
    docker compose up --build
    ;;

  "up:detach" | "up:d")
    echo -e "${GREEN}▶  Starting in background...${NC}"
    docker compose up --build -d
    echo -e "${GREEN}✓  Services started!${NC}"
    echo ""
    echo "  Frontend  → http://localhost:80"
    echo "  API       → http://localhost:3000"
    echo "  WebSocket → http://localhost:4003"
    echo ""
    echo "  Logs dekhne ke liye: ./scripts/dev.sh logs"
    ;;

  "down")
    echo -e "${YELLOW}■  Stopping all services...${NC}"
    docker compose down
    echo -e "${GREEN}✓  Stopped!${NC}"
    ;;

  "reset")
    echo -e "${RED}⚠  Sab kuch reset ho jaayega — volumes bhi delete honge!${NC}"
    read -p "   Sure ho? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      docker compose down -v --remove-orphans
      echo -e "${GREEN}✓  Reset complete — fresh start!${NC}"
    else
      echo "Cancelled."
    fi
    ;;

  "logs")
    SERVICE=${2:-""}  
    if [ -z "$SERVICE" ]; then
      docker compose logs -f
    else
      docker compose logs -f "$SERVICE"
    fi
    ;;

  "ps")
    docker compose ps
    ;;

  "restart")
    SERVICE=${2:-""}
    if [ -z "$SERVICE" ]; then
      docker compose restart
    else
      echo -e "${YELLOW}↺  Restarting $SERVICE...${NC}"
      docker compose restart "$SERVICE"
      echo -e "${GREEN}✓  $SERVICE restarted!${NC}"
    fi
    ;;

  "shell")

    SERVICE=${2:-"auth-service"}
    echo -e "${BLUE}→  Opening shell in $SERVICE...${NC}"
    docker compose exec "$SERVICE" sh
    ;;

  *)
    echo "Usage: ./scripts/dev.sh [command] [service]"
    echo ""
    echo "Commands:"
    echo "  up              — Start karo (logs dikhao)"
    echo "  up:d            — Start karo (background)"
    echo "  down            — Band karo"
    echo "  reset           — Sab delete karo (fresh start)"
    echo "  logs [service]  — Logs dekho"
    echo "  ps              — Running containers dekho"
    echo "  restart [svc]   — Restart karo"
    echo "  shell [service] — Container mein jaao"
    ;;
esac