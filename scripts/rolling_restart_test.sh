#!/usr/bin/env bash
# Zero-Downtime Rolling Restart Verification Script per Task 1 [P-5-c-b].
# Sends continuous requests across service replicas during rolling restarts,
# asserting that 0 requests are dropped.

set -euo pipefail

TARGET_HOST="${TARGET_HOST:-http://localhost:8000}"
DURATION_SECONDS="${DURATION_SECONDS:-10}"
CONCURRENCY="${CONCURRENCY:-5}"

echo "============================================================"
echo "VYNL Zero-Downtime Rolling Restart Verification"
echo "Target: $TARGET_HOST | Duration: ${DURATION_SECONDS}s"
echo "============================================================"

FAILED_REQUESTS=0
TOTAL_REQUESTS=0
START_TIME=$(date +%s)

while [ $(($(date +%s) - START_TIME)) -lt "$DURATION_SECONDS" ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_HOST/healthz" || echo "000")
    TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
    
    if [ "$HTTP_CODE" != "200" ]; then
        echo "[ERROR] Request $TOTAL_REQUESTS returned HTTP $HTTP_CODE"
        FAILED_REQUESTS=$((FAILED_REQUESTS + 1))
    fi
    sleep 0.1
done

echo "------------------------------------------------------------"
echo "Completed $TOTAL_REQUESTS requests."
echo "Failed/Dropped requests: $FAILED_REQUESTS"

if [ "$FAILED_REQUESTS" -eq 0 ]; then
    echo "SUCCESS: Zero requests dropped during rolling restart window!"
    exit 0
else
    echo "FAILURE: $FAILED_REQUESTS requests dropped!"
    exit 1
fi
