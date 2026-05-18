
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3000}"

echo -e "${YELLOW}🌱 Seeding demo data...${NC}"

echo -e "\n→  Creating user: alice"
ALICE=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@demo.com","password":"alice123"}')

ALICE_TOKEN=$(echo $ALICE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓  Alice created${NC}"

echo -e "→  Creating user: bob"
BOB=$(curl -s -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@demo.com","password":"bob123"}')

BOB_TOKEN=$(echo $BOB | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓  Bob created${NC}"

echo -e "→  Creating demo room..."
ROOM=$(curl -s -X POST "$API_URL/api/rooms/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"name":"Demo Room","language":"javascript"}')

ROOM_CODE=$(echo $ROOM | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓  Room created — code: $ROOM_CODE${NC}"

echo -e "→  Bob joining room..."
curl -s -X POST "$API_URL/api/rooms/join" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d "{\"code\":\"$ROOM_CODE\"}" > /dev/null

echo -e "${GREEN}✓  Bob joined!${NC}"

echo ""
echo -e "${GREEN}🎉 Seed complete!${NC}"
echo ""
echo "  Alice  → alice@demo.com / alice123"
echo "  Bob    → bob@demo.com / bob123"
echo "  Room   → Code: $ROOM_CODE"
echo ""
echo "  Test karo: http://localhost"