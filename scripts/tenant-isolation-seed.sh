set -e
API=http://127.0.0.1:3399/api
j() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
reg_ret() { curl -s -X POST "$API/auth/register/retailer" -H 'Content-Type: application/json' -d "$1" | j 'd["accessToken"]'; }
reg_rec() { curl -s -X POST "$API/auth/register/recipient" -H 'Content-Type: application/json' -d "$1" | j 'd["accessToken"]'; }

A_TOK=$(reg_ret '{"email":"a@sec.invalid","password":"Str0ng-P4ssw0rd","fullName":"Alice Alpha","legalName":"Alpha Foods S.L.","tradeName":"Alpha","taxId":"SEC-A","businessType":"SUPERMARKET"}')
B_TOK=$(reg_ret '{"email":"b@sec.invalid","password":"Str0ng-P4ssw0rd","fullName":"Bob Beta","legalName":"Beta Foods S.L.","tradeName":"Beta","taxId":"SEC-B","businessType":"BAKERY"}')
N_TOK=$(reg_rec '{"email":"n@sec.invalid","password":"Str0ng-P4ssw0rd","fullName":"Nora Nu","displayName":"Nu Foodbank","type":"FOOD_BANK","timezone":"Europe/Madrid"}')
M_TOK=$(reg_rec '{"email":"m@sec.invalid","password":"Str0ng-P4ssw0rd","fullName":"Mia Mu","displayName":"Mu Kitchen","type":"SOUP_KITCHEN","timezone":"Europe/Madrid"}')
AH=(-H "Authorization: Bearer $A_TOK" -H 'Content-Type: application/json')
NH=(-H "Authorization: Bearer $N_TOK" -H 'Content-Type: application/json')

A_RET=$(curl -s "$API/me" "${AH[@]}" | j 'd["retailer"]["id"]')
N_REC=$(curl -s "$API/me" "${NH[@]}" | j 'd["recipient"]["id"]')

A_LOC=$(curl -s -X POST "$API/locations" "${AH[@]}" -d "{\"retailerId\":\"$A_RET\",\"label\":\"Alpha Secret Branch\",\"addressLine1\":\"Carrer Secret 1\",\"city\":\"Barcelona\",\"countryCode\":\"ES\",\"timezone\":\"Europe/Madrid\",\"type\":\"STORE\",\"isActive\":true,\"isPrimary\":true}" | j 'd["id"]')
A_PROD=$(curl -s -X POST "$API/products" "${AH[@]}" -d "{\"retailerId\":\"$A_RET\",\"name\":\"Alpha Secret Product\",\"category\":\"BAKERY\",\"defaultUnit\":\"UNIT\"}" | j 'd["id"]')
A_LOT=$(curl -s -X POST "$API/inventory-items" "${AH[@]}" -d "{\"locationId\":\"$A_LOC\",\"productId\":\"$A_PROD\",\"quantity\":5,\"unit\":\"UNIT\",\"weightKg\":3,\"retailValue\":99.99,\"reason\":\"NEAR_EXPIRY\",\"isListed\":false}" | j 'd["id"]')
A_CONTACT=$(curl -s -X POST "$API/contacts" "${AH[@]}" -d "{\"retailerId\":\"$A_RET\",\"fullName\":\"Alpha Private Contact\",\"phone\":\"+34999888777\",\"type\":\"OPERATIONS\"}" | j 'd["id"]')
N_VEH=$(curl -s -X POST "$API/recipient-vehicles" "${NH[@]}" -d "{\"recipientId\":\"$N_REC\",\"plate\":\"NU-0001\",\"isRefrigerated\":false,\"isActive\":true}" | j 'd["id"]')

# A donation between Alpha and Nu, carried to a certificate.
curl -s -X POST "$API/partnerships" "${AH[@]}" -d "{\"retailerId\":\"$A_RET\",\"recipientId\":\"$N_REC\",\"status\":\"ACTIVE\"}" -o /dev/null
iso() { python3 -c "import datetime,sys;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=float(sys.argv[1]))).isoformat().replace('+00:00','Z'))" "$1"; }
DON=$(curl -s -X POST "$API/donations" "${AH[@]}" -d "{\"retailerId\":\"$A_RET\",\"locationId\":\"$A_LOC\",\"recipientId\":\"$N_REC\",\"pickupWindowStart\":\"$(iso 1)\",\"pickupWindowEnd\":\"$(iso 3)\",\"inventoryItemIds\":[\"$A_LOT\"]}" | j 'd["id"]')
curl -s -X PATCH "$API/donations/$DON/offer" "${AH[@]}" -d '{}' -o /dev/null
curl -s -X PATCH "$API/donations/$DON/accept" "${NH[@]}" -d "{\"recipientVehicleId\":\"$N_VEH\"}" -o /dev/null
curl -s -X PATCH "$API/donations/$DON/ready-for-pickup" "${AH[@]}" -d '{}' -o /dev/null
TOK=$(curl -s -X POST "$API/donations/$DON/pickup-token" "${AH[@]}" -d '{}' | j 'd["code"]')
REC_ID=$(curl -s -X POST "$API/donations/$DON/confirm" "${AH[@]}" -d "{\"pickupTokenCode\":\"$TOK\"}" | j 'd["id"]')

cat > /tmp/sec-ids.env <<EOF
A_TOK=$A_TOK
B_TOK=$B_TOK
N_TOK=$N_TOK
M_TOK=$M_TOK
A_RET=$A_RET
N_REC=$N_REC
A_LOC=$A_LOC
A_PROD=$A_PROD
A_LOT=$A_LOT
A_CONTACT=$A_CONTACT
N_VEH=$N_VEH
DON=$DON
REC_ID=$REC_ID
EOF
echo "  seeded: retailer A, retailer B, NGO Nu, NGO Mu; donation $DON -> certificate $REC_ID"
