#!/usr/bin/env bash
# Verifica que o bundle em dist/ aponta para o projeto Firebase correto.
# Uso:
#   scripts/verify-build-target.sh teste    → exige bolao-do-bolero-teste
#   scripts/verify-build-target.sh prod     → exige bolao-do-bolero (sem -teste)
#
# Sai com código 1 se o bundle estiver errado, impedindo o deploy.

set -euo pipefail

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "❌  Uso: verify-build-target.sh [teste|prod]"
  exit 1
fi

DIST_DIR="$(dirname "$0")/../dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌  Pasta dist/ não encontrada. Rode o build primeiro."
  exit 1
fi

# Procura o projectId embutido no bundle JS (pode estar entre aspas ou backticks)
BUNDLE_PROJECT=$(grep -roh 'projectId:[`"'"'"']bolao-do-bolero[^`"'"'"']*' "$DIST_DIR/assets/"*.js 2>/dev/null | head -1 | sed 's/projectId:[`"'"'"']//' || true)

if [[ -z "$BUNDLE_PROJECT" ]]; then
  echo "❌  Não foi possível detectar o projectId no bundle. Verifique o build."
  exit 1
fi

if [[ "$TARGET" == "teste" ]]; then
  if [[ "$BUNDLE_PROJECT" == *"-teste"* ]]; then
    echo "✅  Bundle aponta para $BUNDLE_PROJECT (correto para deploy de TESTE)"
    exit 0
  else
    echo "❌  ERRO: bundle aponta para $BUNDLE_PROJECT mas o alvo é TESTE."
    echo "   Rode: npm run build   (sem :prod)"
    exit 1
  fi
elif [[ "$TARGET" == "prod" ]]; then
  if [[ "$BUNDLE_PROJECT" == *"-teste"* ]]; then
    echo "❌  ERRO: bundle aponta para $BUNDLE_PROJECT mas o alvo é PRODUÇÃO."
    echo "   Rode: npm run build:prod"
    exit 1
  else
    echo "✅  Bundle aponta para $BUNDLE_PROJECT (correto para deploy de PRODUÇÃO)"
    exit 0
  fi
else
  echo "❌  Alvo inválido: '$TARGET'. Use 'teste' ou 'prod'."
  exit 1
fi
