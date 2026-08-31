#!/bin/bash
PID=$1
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo "{\"success\": true, \"message\": \"Process $PID killed\"}"
else
    echo "{\"success\": false, \"message\": \"PID required\"}"
fi