#!/bin/bash
# Wrapper: intercepts @expo/ngrok calls and routes to ngrok v3 with static domain
exec /opt/homebrew/bin/ngrok http 8083 \
  --domain=bpt-academy.ngrok.app \
  --log=stdout "$@"
