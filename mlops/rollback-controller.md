# Automated rollback design

Alertmanager should POST the negative-reward alert to a protected remediation
endpoint. The controller must verify the alert signature, identify the active
Argo CD application revision, and request a rollback to the previous synced
revision. Every action must be written to an audit log. This design is
intentionally configuration-only until Argo CD and Alertmanager credentials
are available.

