# TerraPrep resume instructions

## Goal and architecture

Maintain a dependency-free HTML5 Terraform Associate (004) practice app for
`tf-004.thwin.net`. Read [README.md](./README.md) for features and sources.
The app is already implemented; inspect it before replacing or adding features.
Use original educational questions with explanations and official source links,
never exam dumps or copied proprietary question banks.

- [index.html](./index.html): semantic page shell and confirmation dialogs.
- [app.js](./app.js): routes, localStorage, practice, scoring, and persisted timer.
- [questions.json](./questions.json): 168 original questions, eight topics,
  all 37 official subobjectives, and stable IDs/options for existing progress.
- [question-bank.js](./question-bank.js): validates JSON before restoring state.
- [styles.css](./styles.css): responsive layout, no external assets.
- [deploy.sh](./deploy.sh): repeatable k3s deployment using ConfigMaps.
- [k8s/](./k8s/): restricted namespace, non-root nginx, Service and HTTP config.

## Resume safely

1. Read this file and the README; inspect current files and cluster state.
2. Verify current official 004 objectives before editing content. As checked on
   November 7, 2026, the official study guide targets Terraform 1.12.
3. Preserve question IDs and answer ordering; migrating stored progress is
   required for incompatible changes to the `terraprep-v1` schema.
4. Validate learning feedback, multiple-answer scoring, bookmarks, results,
   timed test reload/expiry, storage errors, and mobile layout. Run
   `python3 -m unittest discover -s tests -v` for content and legacy compatibility.
   Test JSON HTTP/parse/schema failures without overwriting saved progress.
   Serve over HTTP; direct `file:` opening cannot reliably fetch JSON.
5. Redeploy with `sh deploy.sh`, then verify rollout, health endpoint and all
   five assets. ConfigMap updates require the restart included in the script.

Learning mode can include all 168 questions. Timed tests retain 54 questions
in 60 minutes, sampling at least one from every topic and filling the remainder
randomly. This is a custom practice format, not official exam weighting.
Active sessions saved before expansion retain their existing IDs and deadline.

## Deployment boundary

Use only namespace `terraform-learning`; Deployment/Service `terraprep`.
The container HTTP port is `8080`, domain `tf-004.thwin.net`. Use a ClusterIP
Service and the shared `traefik` IngressClass with namespace TLS Secret
`cloudflare-origin-tls`. K3s ServiceLB publishes Traefik on 80/443 without
allocated NodePorts. Do not change the permanent Service to NodePort or use
application host networking. The user requested a separate temporary NodePort
Service `terraprep-temporary` on port `30084` while configuring Cloudflare.
Its optional manifest is [k8s/temporary-nodeport.yaml](./k8s/temporary-nodeport.yaml);
do not add it to the normal deployment script. Remove it once Cloudflare is
ready using `kubectl delete -f k8s/temporary-nodeport.yaml`.
Minecraft alone retains its separate host-network requirement.

The user configures Cloudflare proxied DNS to `64.235.41.183` with Full (strict)
TLS. No tunnel or origin-port override is required. The origin uses the existing
Cloudflare wildcard certificate, not a browser-trusted certificate.
Shared controller configuration and TLS provisioning require a cluster
administrator; normal app changes remain within `terraform-learning`.
Do not mount host directories, use privileged pods, or modify unrelated workloads.

Do not claim public HTTPS is working until verified separately after Cloudflare
configuration. Keep deployment commands and verified status in README current.

## Current handoff

Deployment migrated November 7, 2026. The app is reachable through shared
HTTPS ingress at `64.235.41.183:443`; SNI/hostname, CA validation, and `/healthz`
were verified. The permanent Service remains ClusterIP. A separate temporary
Service now provides HTTP access at `http://64.235.41.183:30084` by user request;
it does not replace ingress.
App/browser and deployed-asset checks passed; see README's verified status.
No app code replacement was needed. The remaining user-owned step is Cloudflare
hostname routing for public HTTPS (currently Cloudflare 523). Rerun cluster and HTTP checks on resume;
do not assume this snapshot is still current.

Question maintenance now uses strict JSON, not executable question data or
CSV. Add original, source-linked questions; do not import leaked dumps or
proprietary banks. All 120 pre-expansion entries remain unchanged and are
protected by compatibility tests. Reviewing OpenExamPrep's 215 public prompts
identified concept gaps; 48 original questions were authored from supporting
HashiCorp documentation, without importing or paraphrasing its questions.
This does not verify every external answer. Use Terraform 1.12 language/CLI
references and current HCP documentation, avoiding features introduced after
1.12. Terraform tests are labeled supplementary, not an explicit 004 objective.
