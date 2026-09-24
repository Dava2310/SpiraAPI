API=http://127.0.0.1:3399/api
. /tmp/sec-ids.env
# Probe as retailer B (a competitor) and as NGO Mu (an unrelated recipient).
probe() { # label, token-name, path, needle
  local out code
  out=$(curl -s -w '\n%{http_code}' "$API$3" -H "Authorization: Bearer ${!2}")
  code=$(echo "$out" | tail -1)
  body=$(echo "$out" | sed '$d')
  if echo "$body" | grep -q "$4" 2>/dev/null; then
    printf "  LEAK   %-14s %-46s HTTP %s  (found %s)\n" "$2" "$3" "$code" "$4"
  else
    printf "  ok     %-14s %-46s HTTP %s\n" "$2" "$3" "$code"
  fi
}
echo "--- retailer B probing retailer A's data ---"
probe l B_TOK "/inventory-items?locationId=$A_LOC"            "Alpha Secret Product"
probe l B_TOK "/inventory-items/$A_LOT"                        "99.99"
probe l B_TOK "/inventory-items/by-location/$A_LOC"            "Alpha Secret Product"
probe l B_TOK "/locations"                                     "Alpha Secret Branch"
probe l B_TOK "/locations/$A_LOC"                              "Carrer Secret 1"
probe l B_TOK "/products"                                      "Alpha Secret Product"
probe l B_TOK "/contacts"                                      "Alpha Private Contact"
probe l B_TOK "/donations"                                     "$A_LOC"
probe l B_TOK "/donations/$DON"                                "$A_LOC"
probe l B_TOK "/donation-receipts"                             "Alpha Foods"
probe l B_TOK "/donation-receipts/$REC_ID"                     "SEC-A"
probe l B_TOK "/retailers"                                     "SEC-A"
probe l B_TOK "/recipients"                                    "Nu Foodbank"
probe l B_TOK "/recipient-vehicles"                            "NU-0001"
probe l B_TOK "/partnerships"                                  "$A_RET"
probe l B_TOK "/location-pickup-slots/by-location/$A_LOC"       "\["
echo "--- NGO Mu probing others' data ---"
probe l M_TOK "/inventory-items?locationId=$A_LOC"             "Alpha Secret Product"
probe l M_TOK "/inventory-items?locationId=$A_LOC&isListed=false" "Alpha Secret Product"
probe l M_TOK "/donation-receipts"                             "Alpha Foods"
probe l M_TOK "/recipient-vehicles"                            "NU-0001"
probe l M_TOK "/contacts"                                      "Alpha Private Contact"
probe l M_TOK "/donations"                                     "$A_LOC"
