# Source me:  source docs/backward-compatibility-check/local-n8n/env.sh
# Isolated local n8n: its own user folder (SQLite DB, encryption key, installed
# community packages), so nothing touches ~/.n8n. Override N8N_E2E_DIR to relocate.
export N8N_E2E_DIR="${N8N_E2E_DIR:-${TMPDIR:-/tmp}/n8n-cloudinary-e2e}"
export N8N_USER_FOLDER="$N8N_E2E_DIR/home"
export N8N_BIN="${N8N_BIN:-$N8N_E2E_DIR/n8n/node_modules/.bin/n8n}"
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_VERSION_NOTIFICATIONS_ENABLED=false
export N8N_PERSONALIZATION_ENABLED=false
export N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
export N8N_LOG_LEVEL="${N8N_LOG_LEVEL:-warn}"
