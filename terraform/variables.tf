variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "state_bucket_name" {
  type        = string
  description = "Existing encrypted S3 bucket used for Terraform state."
  default     = null
}

variable "state_lock_table_name" {
  type        = string
  description = "Existing DynamoDB table used for Terraform state locking."
  default     = null
}
