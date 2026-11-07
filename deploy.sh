#!/bin/sh
set -eu
cd "$(dirname "$0")"

PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
kubectl apply -f k8s/namespace.yaml
kubectl get ingressclass traefik >/dev/null
kubectl -n terraform-learning get secret cloudflare-origin-tls >/dev/null
kubectl -n terraform-learning create configmap terraprep-assets \
  --from-file=index.html --from-file=app.js --from-file=question-bank.js --from-file=questions.json \
  --from-file=styles.css --dry-run=client -o yaml | kubectl apply -f -
kubectl -n terraform-learning create configmap terraprep-nginx \
  --from-file=default.conf=k8s/default.conf \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/app.yaml
kubectl -n terraform-learning rollout restart deployment/terraprep
kubectl -n terraform-learning rollout status deployment/terraprep --timeout=180s
curl -fsS --retry 5 --retry-connrefused --retry-delay 1 \
  --resolve tf-004.thwin.net:443:64.235.41.183 \
  --cacert /etc/ssl/certs/cloudflare-origin-ca.pem \
  https://tf-004.thwin.net/healthz
kubectl -n terraform-learning get pods,svc,ingress
