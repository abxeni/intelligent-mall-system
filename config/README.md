# Configuration and secrets

The repository contains only placeholders. Never commit credentials, private
keys, tokens, passwords, Terraform state, or populated `.env`/`.tfvars` files.

## Local development

1. Copy `.env.example` to `.env`.
2. Replace local development values.
3. Keep `.env` ignored by Git.
4. Use `docker compose --env-file .env up --build`.

For a shared team setup, use a password manager or an approved secret manager
to distribute local development values. Do not put them in chat, issues, or
the repository.

The number of generated demo records, random seed, mall label, and demo
account labels can be changed with the `DEMO_*` and `MALL_NAME` settings in
`.env`. Generated records live in the configured SQLite database and are
created only when that database is empty. Back up or remove the local database
to regenerate a fresh fixture after changing the seed or record counts.

The admin, manager, and customer account switcher is a demo-only role preview,
not authentication. Do not expose this demo service publicly or use it to
protect real customer data. Production access control needs an identity
provider and server-side authorization.

## GitHub Actions

Configure these GitHub repository settings:

- **Secret** `AWS_ROLE_TO_ASSUME`: an IAM role ARN trusted by GitHub's OIDC
  provider and restricted to this repository and its protected branches.
- **Secret** `ECR_REGISTRY`: the AWS account ECR registry hostname.
- **Variable** `AWS_REGION`: the deployment region.

The workflow uses `aws-actions/configure-aws-credentials` with OIDC. No
long-lived AWS access key or secret key belongs in GitHub.

## AWS runtime

Store database passwords, JWT signing keys, and service tokens in AWS Secrets
Manager or SSM Parameter Store using customer-managed KMS encryption. Grant
each workload an IAM role through EKS Pod Identity or IRSA with access only to
the exact secret ARNs it needs.

## Kubernetes and Helm

Do not put secret values in Helm `values.yaml`. Use External Secrets Operator
with an AWS Secrets Manager `SecretStore`, or create a Kubernetes Secret from
an external deployment system. The GitOps repository should contain only
`ExternalSecret` references and non-sensitive configuration.

## Terraform

Create `terraform/backend.hcl` locally from
`terraform/backend.hcl.example`; it is ignored by Git. Use an encrypted S3
backend with DynamoDB locking. Supply sensitive variables through environment
variables such as `TF_VAR_db_password` or a CI secret store, never through
committed `.tfvars` files.
