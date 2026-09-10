#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

df -h --output=source,size,used,avail,pcent,target | tail -n +2 | head -n 5 | awk -v w="$DISK_WARNING" -v c="$DISK_CRITICAL" '
BEGIN { printf "[" }
{
    gsub("%", "", $5);
    status = "NORMAL";
    if ($5 >= c) status = "CRITICAL";
    else if ($5 >= w) status = "WARNING";

    if (NR > 1) printf ",";
    printf "{\"filesystem\":\"%s\",\"size\":\"%s\",\"used\":\"%s\",\"avail\":\"%s\",\"use_pct\":%d,\"mounted\":\"%s\",\"status\":\"%s\"}", $1, $2, $3, $4, $5, $6, status;
}
END { printf "]" }'  