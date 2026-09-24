API=http://127.0.0.1:3399/api
. /tmp/sec-ids.env
pos() {
  local out body code
  out=$(curl -s -w '\n%{http_code}' "$API$2" -H "Authorization: Bearer ${!1}")
  code=$(echo "$out" | tail -1); body=$(echo "$out" | sed '$d')
  if echo "$body" | grep -q "$3" 2>/dev/null; then
    printf "  ok      %-7s %-50s HTTP %s\n" "$1" "$2" "$code"
  else
    printf "  BROKEN  %-7s %-50s HTTP %s (missing %s)\n" "$1" "$2" "$code" "$3"
  fi
}
echo "--- retailer A's own data ---"
pos A_TOK "/inventory-items?locationId=$A_LOC"          "Alpha Secret Product"
pos A_TOK "/inventory-items/$A_LOT"                      "99.99"
pos A_TOK "/locations"                                   "Alpha Secret Branch"
pos A_TOK "/locations/$A_LOC"                            "Carrer Secret 1"
pos A_TOK "/products"                                    "Alpha Secret Product"
pos A_TOK "/contacts"                                    "Alpha Private Contact"
pos A_TOK "/donations"                                   "$A_LOC"
pos A_TOK "/donations/$DON"                              "$A_LOC"
pos A_TOK "/donation-receipts"                           "Alpha Foods"
pos A_TOK "/donation-receipts/$REC_ID"                   "SEC-A"
pos A_TOK "/partnerships"                                "$A_RET"
pos A_TOK "/retailer/dashboard"                          "ready"
echo "--- NGO Nu, the party to that donation ---"
pos N_TOK "/donations/$DON"                              "$A_LOC"
pos N_TOK "/donation-receipts/$REC_ID"                   "Alpha Foods"
pos N_TOK "/recipient-vehicles"                          "NU-0001"
pos N_TOK "/recipients/me/reservations"                  "data"
pos N_TOK "/recipients/me/pickups"                       "Alpha Foods"
pos N_TOK "/recipients/me/surplus-packages"              "Alpha"
pos N_TOK "/inventory-items?locationId=$A_LOC"           "Alpha Secret Product"
