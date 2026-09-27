# Pricing reward alert runbook

1. Check the pricing-agent pod status and `/health` endpoint.
2. Inspect request errors and recent input sales distributions in Grafana.
3. Compare the active policy image tag with the last known-good tag.
4. If the policy is faulty, update the GitOps values file to the previous tag
   and sync the Argo CD application.
5. Record the incident, reward trend, policy tag, and rollback revision.

