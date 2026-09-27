variable "cluster_name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.24.0"
  cluster_name    = var.cluster_name
  cluster_version = "1.30"
  subnet_ids      = var.subnet_ids
  vpc_id          = var.vpc_id
  eks_managed_node_groups = {
    default = {
      instance_types = ["t3.medium"]
      min_size = 2
      max_size = 4
      desired_size = 2
    }
  }
}

