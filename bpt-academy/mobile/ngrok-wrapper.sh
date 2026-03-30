#!/bin/bash
# Wrapper: intercepts @expo/ngrok calls and routes to ngrok v3 with static domain
# Expo calls: ngrok http --log=stdout --authtoken=xxx 8081
# We replace with: ngrok v3 http 8081 --domain=bpt-academy.ngrok.app

exec /opt/homebrew/bin/ngrok http 8081 \
  --domain=bpt-academy.ngrok.app \
  --log=stdout "$@"
