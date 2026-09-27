variable "identifier" { type = string }
variable "subnet_ids" { type = list(string) }

resource "aws_db_subnet_group" "this" {
  name       = "${var.identifier}-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "this" {
  identifier             = var.identifier
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "mall"
  username               = "mall_admin"
  manage_master_user_password = true
  publicly_accessible    = false
  skip_final_snapshot    = true
  db_subnet_group_name   = aws_db_subnet_group.this.name
}

output "endpoint" { value = aws_db_instance.this.address }

