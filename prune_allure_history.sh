#!/bin/bash
# Keep only the last 20 runs in allure-report/history to speed up report loading
HISTORY_DIR="allure-report/history"
if [ -d "$HISTORY_DIR" ]; then
  cd "$HISTORY_DIR"
  # Find all run-*.json, sort by modification time, keep the latest 20
  ls -1t run-*.json 2>/dev/null | tail -n +21 | xargs -r rm --
  cd - > /dev/null
fi
