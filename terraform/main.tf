module "vpc" {
  source = "./modules/vpc"
  name   = "intelligent-mall-${var.environment}"
}

module "ecr" {
  source = "./modules/ecr"
  services = [
    "pricing-agent",
    "apriori-service",
    "recommender-service",
  ]
}

module "eks" {
  source     = "./modules/eks"
  cluster_name = "intelligent-mall-${var.environment}"
  subnet_ids = module.vpc.private_subnet_ids
  vpc_id     = module.vpc.vpc_id
}

module "rds" {
  source     = "./modules/rds-postgres"
  identifier = "intelligent-mall-${var.environment}"
  subnet_ids = module.vpc.private_subnet_ids
}
