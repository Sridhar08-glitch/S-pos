#!/usr/bin/env sh
# S POS — nightly database + media backup (run via cron). Developed by Sridhar Mahalingam.
# Example cron (2am daily):  0 2 * * *  /opt/spos/deploy/backup.sh >> /var/log/spos-backup.log 2>&1
set -eu

BACKUP_DIR="${BACKUP_DIR:-/opt/spos/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database (via the compose db service)
docker compose -f "$(dirname "$0")/docker-compose.prod.yml" exec -T db \
    pg_dump -U "${POSTGRES_USER:-spos}" "${POSTGRES_DB:-spos}" | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

# Media/uploads volume
docker run --rm -v spos_media_data:/media -v "$BACKUP_DIR":/out alpine \
    sh -c "cd /media && tar czf /out/media-$STAMP.tar.gz ." || true

# Prune old backups
find "$BACKUP_DIR" -type f -name '*.gz' -mtime +"$KEEP_DAYS" -delete
echo "Backup complete: $STAMP"
