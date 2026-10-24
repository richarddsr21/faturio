#!/usr/bin/env bash
# Gera, em Markdown, a lista de PRs e issues que vão para produção.
#
# Compara o que está em `develop` (ou --head) e ainda não está em `main`
# (ou --base) e lista os PRs mesclados nesse intervalo, com as issues que
# cada um fecha ("Closes #N").
#
# Uso:
#   scripts/release/notes.sh                  # develop -> main
#   scripts/release/notes.sh --head develop --base main --version v1.2.0
#
# Requer: gh (autenticado), git, jq.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
BASE="main"
HEAD="develop"
VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    --head) HEAD="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    *) echo "argumento desconhecido: $1" >&2; exit 1 ;;
  esac
done

git fetch -q origin "$BASE" "$HEAD"

# Números dos PRs mesclados no intervalo base..head (commits de merge ou squash "(#123)").
PR_NUMBERS=$(git log --format=%s "origin/$BASE..origin/$HEAD" \
  | grep -oE '\(#[0-9]+\)|Merge pull request #[0-9]+' \
  | grep -oE '[0-9]+' | sort -un)

echo "## 🚀 Release ${VERSION:-(sem versão)} — \`$HEAD\` → \`$BASE\`"
echo
echo "_Gerado por \`scripts/release/notes.sh\` em $(date -u +%Y-%m-%d\ %H:%M\ UTC)._"
echo

if [[ -z "$PR_NUMBERS" ]]; then
  echo "Nenhum PR novo entre \`$BASE\` e \`$HEAD\`."
  exit 0
fi

declare -A ISSUES_SEEN=()
PR_ROWS=""
ISSUE_ROWS=""
PR_COUNT=0

for n in $PR_NUMBERS; do
  json=$(gh pr view "$n" --repo "$REPO" \
    --json number,title,url,author,labels,closingIssuesReferences 2>/dev/null || true)
  [[ -z "$json" ]] && continue

  title=$(jq -r .title <<<"$json")
  url=$(jq -r .url <<<"$json")
  author=$(jq -r .author.login <<<"$json")
  labels=$(jq -r '[.labels[].name] | join(", ")' <<<"$json")
  issues=$(jq -r '[.closingIssuesReferences[] | "#\(.number)"] | join(", ")' <<<"$json")

  PR_COUNT=$((PR_COUNT+1))
  PR_ROWS+="| [#$n]($url) | $title | ${labels:-—} | @$author | ${issues:-—} |"$'\n'

  while IFS=$'\t' read -r inum ititle iurl; do
    [[ -z "$inum" || -n "${ISSUES_SEEN[$inum]:-}" ]] && continue
    ISSUES_SEEN[$inum]=1
    ISSUE_ROWS+="- [ ] [#$inum]($iurl) $ititle — via [#$n]($url)"$'\n'
  done < <(jq -r '.closingIssuesReferences[] | [.number, .title, .url] | @tsv' <<<"$json")
done

echo "### Pull requests ($PR_COUNT)"
echo
echo "| PR | Título | Labels | Autor | Fecha |"
echo "|---|---|---|---|---|"
printf "%s" "$PR_ROWS"
echo
echo "### Issues resolvidas (${#ISSUES_SEEN[@]})"
echo
if [[ -z "$ISSUE_ROWS" ]]; then
  echo "_Nenhum PR referencia uma issue com \"Closes #N\"._"
else
  printf "%s" "$ISSUE_ROWS"
fi
echo
echo "### Checklist de deploy"
echo
echo "- [ ] Todas as issues acima foram validadas em ambiente de homologação"
echo "- [ ] Migrations do Supabase aplicadas em produção (se houver)"
echo "- [ ] Variáveis de ambiente novas configuradas na Vercel (se houver)"
echo "- [ ] Comunicação aos clientes preparada (se houver breaking change)"
