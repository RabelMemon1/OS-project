#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

CPU_IDLE=$(top -bn1 | grep "%Cpu" | awk -F',' '{print $4}' | awk '{print $1}' | cut -d'.' -f1)

if [ -z "$CPU_IDLE" ]; then
    CPU_USAGE=$(top -bn1 | grep -i "cpu" | head -n 1 | awk '{print int($2+$4)}')
else
    CPU_USAGE=$((100 - CPU_IDLE))
fi

LOAD_1MIN=$(uptime | awk -F'load average:' '{ print $2 }' | cut -d',' -f1 | xargs)

if [ "$CPU_USAGE" -ge "$CPU_CRITICAL" ]; then
    STATUS="CRITICAL"
elif [ "$CPU_USAGE" -ge "$CPU_WARNING" ]; then
    STATUS="WARNING"
else
    STATUS="NORMAL"
fi

echo "{\"usage\": ${CPU_USAGE:-0}, \"load_1min\": \"${LOAD_1MIN:-0.00}\", \"status\": \"${STATUS}\"}"