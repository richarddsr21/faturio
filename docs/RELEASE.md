# Processo de release

Como uma mudança sai de uma issue e chega em produção, e como saber
exatamente **o que** está indo para produção em cada deploy.

## Branches e ambientes

| Branch | Ambiente | Regra |
|---|---|---|
| `main` | **Produção** (Vercel) | Só recebe merge de `release/*` (ou hotfix). Cada merge gera uma tag `vX.Y.Z`. |
| `develop` | Homologação | Integração. Recebe merge dos branches de feature/fix via PR. |
| `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `chore/<slug>` | Preview (Vercel) | Um branch por issue. Abre PR para `develop`. |
| `release/vX.Y.Z` | — | Criado a partir de `develop` quando vamos fazer deploy. Abre PR para `main`. |
| `hotfix/<issue>-<slug>` | — | Correção urgente direto em `main`. Depois é mesclado de volta em `develop`. |

## Ciclo de uma feature

1. Crie a issue no GitHub (e adicione ao Project, se usar).
2. Crie o branch a partir de `develop`: `feat/12-modais-de-criacao`.
3. Abra o PR para `develop` usando o template padrão. **Obrigatório**:
   - `Closes #12` no corpo (é assim que a issue aparece na lista da release e é fechada automaticamente);
   - pelo menos uma **label** de categoria (ver abaixo) — ela define em qual seção das notas de release o PR aparece.
4. Merge com **squash** (o título do PR vira a mensagem do commit e mantém o `(#N)`, usado para rastrear PRs na release).

### Labels de categoria

| Label | Seção nas notas |
|---|---|
| `breaking-change` | ⚠️ Breaking changes |
| `enhancement` / `feature` | ✨ Funcionalidades |
| `bug` | 🐛 Correções |
| `refactor` / `performance` | ♻️ Refatoração e performance |
| `documentation` | 📝 Documentação |
| `chore` / `dependencies` | 🔧 Infra, dependências e chores |
| `skip-changelog` | Não aparece nas notas |

Configuração em [`.github/release.yml`](../.github/release.yml).

## Fazendo uma release

### 1. Ver o que vai sair

Antes de qualquer coisa, gere a lista do que está em `develop` e ainda não em `main`:

```bash
scripts/release/notes.sh --version v1.2.0
```

Saída: tabela de PRs (com labels, autor e issues que fecham), lista de issues
resolvidas com checkbox e um checklist de deploy. Use isso para decidir se
está tudo pronto e para alinhar com o time/cliente.

### 2. Escolher a versão

[SemVer](https://semver.org/lang/pt-BR/): `vMAJOR.MINOR.PATCH`.

- **PATCH** — só correções (`bug`).
- **MINOR** — qualquer funcionalidade nova (`enhancement`/`feature`).
- **MAJOR** — algo com `breaking-change` que afeta o usuário (rota removida, fluxo alterado, migração de dados).

### 3. Abrir o PR de release

```bash
git checkout develop && git pull
git checkout -b release/v1.2.0
git push -u origin release/v1.2.0
gh pr create --base main --head release/v1.2.0 \
  --title "release: v1.2.0" \
  --body-file <(sed 's/vX.Y.Z/v1.2.0/' .github/PULL_REQUEST_TEMPLATE/release.md) \
  --label release
```

O workflow **Release preview** publica (e mantém atualizado a cada push) um
comentário no PR com a mesma lista do passo 1. Esse comentário é a fonte de
verdade de "o que está indo para produção".

Se algo não deve sair nessa release: reverta o PR em `develop` (ou faça
cherry-pick apenas do que deve ir para o branch `release/*`).

### 4. Validar e mesclar

- Valide em homologação (`develop`) cada issue da lista; marque os checkboxes no comentário.
- Execute os passos manuais (migrations, variáveis de ambiente) **antes** do merge.
- Merge com **merge commit** (não squash) para preservar o histórico dos PRs em `main`.

### 5. Tag e GitHub Release (automático)

Ao mesclar, o workflow **Release** cria a tag `v1.2.0` e a
GitHub Release
com as notas geradas automaticamente, agrupadas por label, listando PRs e
autores desde a tag anterior. A Vercel faz o deploy de `main`.

Se precisar gerar manualmente: **Actions → Release → Run workflow** com a versão.

### 6. Pós-release

- Confira a Release publicada e ajuste o texto se necessário (destaques em linguagem de usuário).
- Feche/mova os itens no projeto do GitHub.
- Se houve hotfix em `main`, mescle `main` de volta em `develop`.

## Hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/45-erro-no-login
# ... corrige, abre PR para main com "Closes #45" ...
```

Após o merge, crie a release manualmente (**Actions → Release → Run workflow**, `v1.2.1`)
e abra um PR de `main` para `develop` para sincronizar.

## Rollback

Reverter o merge commit em `main` (`git revert -m 1 <sha>`), abrir PR e mesclar.
A Vercel redeploya automaticamente. Migrations de banco precisam de rollback
manual — por isso devem ser sempre retrocompatíveis.
