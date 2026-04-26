#!/usr/bin/env bash
# Cria canais de notificacao por email + alertas para
# - Backup diario (backupFirestoreDiario) que falha
# - Functions com erro acima de threshold em janela curta
#
# Uso:
#   bash scripts/setup-cloud-monitoring.sh <projectId> <email>
# Ex:
#   bash scripts/setup-cloud-monitoring.sh bolao-do-bolero emerson.rocco@gmail.com

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Uso: bash scripts/setup-cloud-monitoring.sh <projectId> <email>"
  exit 1
fi

PROJECT_ID="$1"
EMAIL="$2"

echo "==> Setando projeto ativo: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" --quiet

# 1) Notification channel (email) — cria se nao existe
echo "==> Verificando canal de notificacao por email..."
EXISTING=$(gcloud alpha monitoring channels list \
  --project "$PROJECT_ID" \
  --filter="type=email AND labels.email_address=$EMAIL" \
  --format="value(name)" 2>/dev/null | head -1)

if [ -z "$EXISTING" ]; then
  echo "==> Criando canal email -> $EMAIL"
  CHANNEL_NAME=$(gcloud alpha monitoring channels create \
    --project "$PROJECT_ID" \
    --display-name="Email - $EMAIL" \
    --type=email \
    --channel-labels="email_address=$EMAIL" \
    --format="value(name)")
else
  CHANNEL_NAME="$EXISTING"
  echo "==> Canal ja existe: $CHANNEL_NAME"
fi

# Helper para criar policy a partir de YAML inline
function criar_alerta() {
  local DISPLAY_NAME="$1"
  local YAML_FILE="$2"

  EXISTING_POLICY=$(gcloud alpha monitoring policies list \
    --project "$PROJECT_ID" \
    --filter="displayName=\"$DISPLAY_NAME\"" \
    --format="value(name)" 2>/dev/null | head -1)

  if [ -n "$EXISTING_POLICY" ]; then
    echo "==> Alerta '$DISPLAY_NAME' ja existe: $EXISTING_POLICY (skip)"
    return 0
  fi

  echo "==> Criando alerta: $DISPLAY_NAME"
  gcloud alpha monitoring policies create \
    --project "$PROJECT_ID" \
    --policy-from-file="$YAML_FILE" \
    --notification-channels="$CHANNEL_NAME" >/dev/null
}

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# 2) Alerta: Cloud Function com erro nas ultimas 5 min
cat > "$TMPDIR/policy-functions-error.yaml" <<EOF
displayName: "Cloud Functions - erros nas ultimas 5min"
combiner: OR
conditions:
  - displayName: "Function errors > 0"
    conditionThreshold:
      filter: 'metric.type="cloudfunctions.googleapis.com/function/execution_count" AND resource.type="cloud_function" AND metric.labels.status!="ok"'
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_SUM
          crossSeriesReducer: REDUCE_SUM
          groupByFields:
            - resource.label.function_name
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
      trigger:
        count: 1
documentation:
  content: "Uma ou mais Cloud Functions falharam. Veja logs em https://console.firebase.google.com/project/$PROJECT_ID/functions/logs"
  mimeType: "text/markdown"
alertStrategy:
  autoClose: 1800s
EOF
criar_alerta "Cloud Functions - erros nas ultimas 5min" "$TMPDIR/policy-functions-error.yaml"

# 3) Alerta: backup diario nao executado em 26h (horario diario as 00:00 BRT)
cat > "$TMPDIR/policy-backup-missing.yaml" <<EOF
displayName: "Backup Firestore - nao executou em 26h"
combiner: OR
conditions:
  - displayName: "backupFirestoreDiario sem execucoes recentes"
    conditionAbsent:
      filter: 'metric.type="cloudfunctions.googleapis.com/function/execution_count" AND resource.type="cloud_function" AND resource.label.function_name="backupFirestoreDiario"'
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_SUM
          crossSeriesReducer: REDUCE_SUM
      duration: 93600s
documentation:
  content: "A funcao backupFirestoreDiario nao executou nas ultimas 26h. Esperado: 1x ao dia as 00:00 BRT (03:00 UTC)."
  mimeType: "text/markdown"
alertStrategy:
  autoClose: 86400s
EOF
criar_alerta "Backup Firestore - nao executou em 26h" "$TMPDIR/policy-backup-missing.yaml"

echo ""
echo "==> OK. Canais e alertas configurados em $PROJECT_ID."
echo "    Verifique em: https://console.cloud.google.com/monitoring/alerting/policies?project=$PROJECT_ID"
