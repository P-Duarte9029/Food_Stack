# Deploy no Google Cloud (Cloud Run + Cloud SQL)

Uma imagem só serve a API e o front na **mesma origem** (exigência do cookie `SameSite=Lax` e
do `OriginGuard`). O banco é o Cloud SQL (PostgreSQL), acessado por socket Unix. Região padrão:
`southamerica-east1` (São Paulo).

```
Navegador ──HTTPS──> Cloud Run (1 instância)
                       ├─ /            front buildado (PWA)
                       ├─ /api/*       API NestJS
                       └─ /socket.io   tempo real
                              └─ socket Unix ──> Cloud SQL (PostgreSQL 17)
```

> Os comandos abaixo criam recursos pagos. Nada aqui foi executado: troque os valores entre
> `<...>` e rode você mesmo, com uma conta com permissão no projeto. As imagens foram
> construídas e testadas localmente com Docker; a execução no Cloud Run e no Cloud SQL ainda
> não foi validada.

## 0. Variáveis

```bash
export PROJECT_ID=<id-do-projeto>
export REGION=southamerica-east1
export INSTANCE=food-stack-db
export DB_NAME=foodstack
export DB_USER=foodstack
gcloud config set project $PROJECT_ID
```

## 1. APIs e repositório de imagens

```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create food-stack --repository-format=docker --location=$REGION
```

## 2. Banco (Cloud SQL)

```bash
gcloud sql instances create $INSTANCE --database-version=POSTGRES_17 --edition=ENTERPRISE \
  --tier=db-g1-small --region=$REGION --storage-auto-increase --backup-start-time=03:00
gcloud sql databases create $DB_NAME --instance=$INSTANCE
gcloud sql users create $DB_USER --instance=$INSTANCE --password="<senha-forte>"
```

`db-f1-micro` é mais barato, mas não tem SLA; para um restaurante em operação prefira
`db-g1-small` ou maior.

## 3. Segredos

A URL usa o socket do Cloud SQL (`host=/cloudsql/<conexão>`). Se a senha tiver caracteres
especiais, codifique-a (`@` vira `%40`, etc.).

```bash
CONN=$PROJECT_ID:$REGION:$INSTANCE
printf '%s' "postgresql://$DB_USER:<senha-url-encoded>@localhost/$DB_NAME?host=/cloudsql/$CONN" \
  | gcloud secrets create database-url --data-file=-

# Só para o primeiro acesso (veja a seção 7); senhas com no mínimo 10 caracteres.
printf '%s' "<senha-do-gerente>" | gcloud secrets create seed-manager-password --data-file=-
printf '%s' "<senha-do-super-admin>" | gcloud secrets create seed-super-admin-password --data-file=-
```

## 4. Conta de serviço da aplicação

```bash
gcloud iam service-accounts create food-stack-run
SA=food-stack-run@$PROJECT_ID.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/cloudsql.client
gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
```

## 5. Build das imagens

Na raiz do repositório:

```bash
gcloud builds submit --config cloudbuild.yaml
IMG=$REGION-docker.pkg.dev/$PROJECT_ID/food-stack
```

## 6. Migrations (Cloud Run Job)

Rode **antes de cada deploy** que traga migration (o schema segue o expand/contract do
`CLAUDE.md`, então a versão anterior continua funcionando durante a troca).

```bash
gcloud run jobs create food-stack-migrate --image=$IMG/migrate:latest --region=$REGION \
  --service-account=$SA --set-cloudsql-instances=$CONN --set-secrets=DATABASE_URL=database-url:latest
gcloud run jobs execute food-stack-migrate --region=$REGION --wait
```

Nas próximas vezes: `gcloud run jobs update food-stack-migrate --image=$IMG/migrate:latest --region=$REGION`
e execute de novo.

## 7. Serviço

```bash
gcloud run deploy food-stack --image=$IMG/app:latest --region=$REGION \
  --service-account=$SA --allow-unauthenticated \
  --add-cloudsql-instances=$CONN \
  --min-instances=1 --max-instances=1 --concurrency=1000 --timeout=3600 --session-affinity \
  --set-secrets=DATABASE_URL=database-url:latest,SEED_MANAGER_PASSWORD=seed-manager-password:latest,SEED_SUPER_ADMIN_PASSWORD=seed-super-admin-password:latest \
  --set-env-vars=SEED_MANAGER_EMAIL=<email-do-gerente>,SEED_SUPER_ADMIN_EMAIL=<email-do-super-admin>
```

Com a URL gerada (`https://food-stack-<hash>.<região>.run.app`), informe-a como origem permitida:

```bash
URL=$(gcloud run services describe food-stack --region=$REGION --format='value(status.url)')
gcloud run services update food-stack --region=$REGION --update-env-vars=WEB_ORIGIN=$URL
```

Sem `WEB_ORIGIN` correto o login e o tempo real são recusados (anti-CSRF). Com domínio próprio,
use a URL do domínio (aceita vários, separados por vírgula).

**Primeiro acesso:** o gerente e o super admin são criados na primeira execução, se ainda não
houver usuários. Depois disso, remova as variáveis `SEED_*` do serviço:

```bash
gcloud run services update food-stack --region=$REGION \
  --remove-secrets=SEED_MANAGER_PASSWORD,SEED_SUPER_ADMIN_PASSWORD \
  --remove-env-vars=SEED_MANAGER_EMAIL,SEED_SUPER_ADMIN_EMAIL
```

## Por que esses parâmetros

| Parâmetro | Motivo |
|---|---|
| `--max-instances=1` | O Socket.IO e o limite de tentativas de login guardam estado em memória. Com mais instâncias seria preciso um adaptador (ex.: Redis) e o limitador compartilhado. |
| `--min-instances=1` | O restaurante não pode esperar uma partida a frio no horário de serviço. |
| `--concurrency=1000` | Cada conexão WebSocket conta como uma requisição simultânea; o padrão (80) limitaria os clientes conectados. |
| `--timeout=3600` | Duração máxima de cada conexão; o cliente reconecta e recarrega o estado sozinho. |
| `--session-affinity` | Mantém o polling do Socket.IO na mesma instância. |
| `TRUST_PROXY=1` (na imagem) | Faz o IP real do cliente chegar ao limite de login, em vez do IP do proxy. |

## Operação

- **Novo release:** `gcloud builds submit --config cloudbuild.yaml` → atualizar e executar o job de
  migrations → `gcloud run deploy food-stack --image=$IMG/app:latest --region=$REGION`.
- **Rollback:** `gcloud run services update-traffic food-stack --region=$REGION --to-revisions=<revisão>=100`.
  Como as migrations só adicionam (expand), a revisão anterior continua compatível.
- **Logs:** `gcloud run services logs read food-stack --region=$REGION`.
- **Backups:** automáticos pelo Cloud SQL (`--backup-start-time`); teste uma restauração antes de ir
  para produção.
