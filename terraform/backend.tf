terraform {
  backend "s3" {
    # Values are supplied at init time from backend.hcl, not committed here.
    # terraform init -backend-config=backend.hcl
  }
}
