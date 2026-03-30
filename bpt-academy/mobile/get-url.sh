#!/bin/bash
# Quick script to get the current Expo tunnel URL
# Usage: bash get-url.sh

TUNNEL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys,json
try:
    d = json.load(sys.stdin)
    tunnels = d.get('tunnels', [])
    if tunnels:
        url = tunnels[0]['public_url'].replace('https://', 'exp://')
        print(url)
    else:
        print('No tunnel active')
except:
    print('ngrok not running')
")

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│  BPT Academy - Current Tunnel URL                   │"
echo "├─────────────────────────────────────────────────────┤"
echo "│  $TUNNEL"
echo "│                                                     │"
echo "│  Open in Safari on iPhone, then Open in Expo Go    │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
