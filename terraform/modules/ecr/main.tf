variable "services" { type = list(string) }

resource "aws_ecr_repository" "service" {
  for_each             = toset(var.services)
  name                 = "intelligent-mall/${each.value}"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

output "repository_urls" { value = { for name, repo in aws_ecr_repository.service : name => repo.repository_url } }

