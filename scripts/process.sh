#!/bin/bash
ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -n 11 | tail -n +2 | awk '
BEGIN { printf "[" }
{
    if (NR > 1) printf ",";
    printf "{\"pid\":%s,\"name\":\"%s\",\"cpu\":\"%s\",\"mem\":\"%s\"}", $1, $2, $3, $4;
}
END { printf "]" }'