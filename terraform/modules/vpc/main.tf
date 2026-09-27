variable "name" { type = string }

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"
  name    = var.name
  cidr    = "10.40.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.40.1.0/24", "10.40.2.0/24"]
  public_subnets  = ["10.40.101.0/24", "10.40.102.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = true
}

output "private_subnet_ids" { value = module.vpc.private_subnets }
output "vpc_id" { value = module.vpc.vpc_id }
