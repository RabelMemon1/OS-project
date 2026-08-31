#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

TOTAL_MB=$(free -m | awk '/^Mem:/{print $2}')
USED_MB=$(free -m | awk '/^Mem:/{print $3}')
AVAIL_MB=$(free -m | awk '/^Mem:/{print $7}')
USAGE_PCT=$(( USED_MB * 100 / TOTAL_MB ))

if [ "$USAGE_PCT" -ge "$RAM_CRITICAL" ]; then
    STATUS="CRITICAL"
elif [ "$USAGE_PCT" -ge "$RAM_WARNING" ]; then
    STATUS="WARNING"
else
    STATUS="NORMAL"
fi

echo "{\"total_mb\": ${TOTAL_MB:-0}, \"used_mb\": ${USED_MB:-0}, \"avail_mb\": ${AVAIL_MB:-0}, \"usage_pct\": ${USAGE_PCT:-0}, \"status\": \"${STATUS}\"}"