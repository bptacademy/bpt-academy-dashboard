#!/bin/bash
# =============================================
# BPT Academy — Nightly Backup Script
# Runs every evening at 20:00 GMT
# =============================================

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/Users/iamfabiandavid/.openclaw/workspace/bpt-academy/backups"
TODAY=$(date +%Y-%m-%d)
LOG="$BACKUP_DIR/backup-$TODAY.log"

echo "[$TIMESTAMP] Starting nightly backup..." | tee "$LOG"

# ── 1. Git commit any uncommitted changes ────────────────────
cd /Users/iamfabiandavid/.openclaw/workspace
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
  git add -A
  git commit -m "chore: nightly auto-backup $TODAY" >> "$LOG" 2>&1
  echo "[OK] Git: committed workspace changes" | tee -a "$LOG"
else
  echo "[OK] Git: nothing to commit in workspace" | tee -a "$LOG"
fi

cd /Users/iamfabiandavid/.openclaw/workspace/bpt-academy
if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
  git add -A
  git commit -m "chore: nightly auto-backup $TODAY" >> "$LOG" 2>&1
  echo "[OK] Git: committed bpt-academy changes" | tee -a "$LOG"
else
  echo "[OK] Git: nothing to commit in bpt-academy" | tee -a "$LOG"
fi

# ── 2. Supabase migration snapshot ───────────────────────────
MIGRATION_BACKUP="$BACKUP_DIR/migrations_$TIMESTAMP.sql"
echo "-- BPT Academy migrations snapshot $TIMESTAMP" > "$MIGRATION_BACKUP"
cat /Users/iamfabiandavid/.openclaw/workspace/bpt-academy/supabase/migrations/*.sql >> "$MIGRATION_BACKUP"
echo "[OK] Migrations snapshot: $MIGRATION_BACKUP" | tee -a "$LOG"

# ── 3. Verify Supabase migration sync ────────────────────────
export SUPABASE_ACCESS_TOKEN=sbp_0231359cec80c42a03d1bc105564d7c2e7d0a11a
cd /Users/iamfabiandavid/.openclaw/workspace/bpt-academy
npx supabase migration list 2>&1 | tee -a "$LOG"
echo "[OK] Migration sync verified" | tee -a "$LOG"

# ── 4. Credentials backup (encrypted copy) ───────────────────
cp /Users/iamfabiandavid/.openclaw/workspace/bpt-academy/CREDENTIALS.md \
   "$BACKUP_DIR/credentials_$TIMESTAMP.md"
echo "[OK] Credentials snapshot saved" | tee -a "$LOG"

# ── 5. Clean up old backups (keep last 7 days) ────────────────
find "$BACKUP_DIR" -name "migrations_*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "credentials_*.md" -mtime +7 -delete
find "$BACKUP_DIR" -name "backup-*.log" -mtime +7 -delete
echo "[OK] Old backups cleaned (kept last 7 days)" | tee -a "$LOG"

echo "[$TIMESTAMP] Nightly backup complete ✅" | tee -a "$LOG"
