# TerraPrep

A dependency-free HTML5 study app for **HashiCorp Terraform Associate (004)**.
Includes 168 original exam-style questions covering all eight objective areas
and all 37 official subobjectives,
single-answer, multiple-answer, and true/false formats, answer explanations,
and official documentation links. It is not affiliated with HashiCorp and does
not contain actual exam questions or exam dumps.

## Run

Serve this directory (opening a `file:` URL cannot fetch the JSON bank reliably):

```sh
cd /home/k8s-operator/src/terraform-learning
python3 -m http.server 8080 --bind 127.0.0.1
```

Then visit <http://localhost:8080>. No installation, build, account, API key,
or cloud infrastructure is required. Keep the server in the foreground and
stop it with Ctrl-C when finished.

## k3s deployment

The app uses its own namespace, **terraform-learning**, with a non-root nginx
Deployment, ClusterIP Service, and Traefik HTTPS Ingress. No build or registry push is needed: only
the five public app assets and nginx configuration are uploaded as ConfigMaps.
Do not store secrets in these files.

```sh
sh deploy.sh
kubectl -n terraform-learning get pods,svc,ingress
curl -fsS --resolve tf-004.thwin.net:443:64.235.41.183 \
  --cacert /etc/ssl/certs/cloudflare-origin-ca.pem \
  https://tf-004.thwin.net/healthz
```

The script runs the JSON content tests before changing cluster resources,
restarts the Deployment after uploading assets, waits for readiness,
then verifies the HTTPS ingress health endpoint with bounded retries.
It requires the shared `traefik` IngressClass, namespace TLS Secret
`cloudflare-origin-tls`, and the Cloudflare Origin CA installed at the path
above by the cluster administrator. Run it on the k3s node; it can be rerun after edits.
Rolling updates wait for stable readiness and delay old-container shutdown
briefly to let Service endpoints update. Browser progress remains in localStorage; no
server-side data or persistent volume is needed. Only public assets are served,
not these instructions or deployment files.

### Domain and Cloudflare

Domain: **tf-004.thwin.net**. HTTPS origin: **64.235.41.183:443**.
Jitsi and TerraPrep share Traefik, exposed through K3s ServiceLB on standard
ports 80/443. HTTP redirects to HTTPS; application Services are private
ClusterIP Services. The permanent deployment has no NodePorts or per-app
host-network listeners; temporary access is documented below.

Configure Cloudflare proxied DNS to `64.235.41.183`, with **Full (strict)**
origin encryption. Remove any old tunnel route or origin-port override to
`30084`. The namespace TLS Secret contains the existing `*.thwin.net`
Cloudflare Origin certificate; direct browser access to the origin is not
publicly trusted. No Tunnel or port override is required.

The origin is verified with hostname and CA validation. The public Cloudflare
URL currently returns **523 (origin unreachable)** and still needs the user's
Cloudflare DNS/origin routing configuration checked. Do not treat this as a
successful public deployment until <https://tf-004.thwin.net/healthz> returns 200.

### Temporary access before Cloudflare setup

An optional, separate Service, `terraprep-temporary`, exposes
<http://64.235.41.183:30084> over plain HTTP. It leaves the permanent ClusterIP
Service and HTTPS ingress unchanged. The user requested this temporary access
on November 7, 2026; it is not installed by `deploy.sh`.

```sh
kubectl apply -f k8s/temporary-nodeport.yaml
curl -fsS http://64.235.41.183:30084/healthz
```

Remove it once Cloudflare HTTPS works:

```sh
kubectl delete -f k8s/temporary-nodeport.yaml
```

Progress on this HTTP IP/port origin is separate from progress on the HTTPS
domain. Browser-local progress will not transfer automatically.

### Verified status

Deployed on November 7, 2026: one ready replica, healthy Service endpoints,
and the HTTPS ingress `/healthz` returning `200`. The original four served assets were byte-compared with
the workspace; project/deployment files correctly return `404`. Browser checks
passed for the original 54 question schemas, eight topics, exact-set scoring, learning
feedback, multiple-answer selection, bookmarks, reload persistence, results,
retry, 60-minute deadline persistence, automatic expiry, reset, storage error
reporting, and 390px mobile layouts. The deployed app ran without page errors
under its Content Security Policy. The NodePort was removed during the shared
ingress migration; public Cloudflare HTTPS currently returns 523.

The bank was subsequently expanded to 120 questions in JSON. Content tests
pass for all 37 subobjectives and legacy storage compatibility. Browser checks
passed for schema rejection, HTTP/JSON/schema error reporting without storage
changes, full-bank learning, new multiple-answer feedback, 25 random timed
samples with 54 distinct questions across every topic, timer expiry, and an
old 54-question session restored across reload. All 49 distinct new-question
documentation paths returned 200; all five deployed assets match the workspace.

The documentation-backed concept-gap expansion brings the bank to 168 questions.
All six content tests pass, including an exact fingerprint of the unchanged
120 pre-expansion entries. The deployed browser validated all 48 new questions'
rendering, feedback, and code escaping; all 168 questions' exact-set scoring;
25 timed samples with 54 distinct questions and all eight topics; and an old
54-question session's choices, bookmarks, and deadline across reload.
New multiple-answer selection works through the UI. At 390px, every new
question fits without page overflow, and dark theme remains default with a
light OS preference. Code blocks scroll internally; the stylesheet URL is
versioned so returning browsers receive the layout fix. Origin HTTPS health
is verified; public Cloudflare health still returns 523.

### Resuming work

[instruction.md](./instruction.md) records architecture, compatibility rules,
verification steps, and deployment boundaries. The workspace's
[Copilot instructions](./.github/copilot-instructions.md) automatically direct
future sessions to that file.

## Learn

Dark theme is the default on every device, including forms and dialogs,
regardless of the operating system's theme preference.

- **Overview:** progress by objective, answer accuracy, bookmarks, and the last
  ten completed sessions.
- **Learning mode:** select an objective and pool, check each answer for immediate
  feedback, and follow its documentation link. Checked answers cannot be changed;
  retry missed questions to submit a new attempt.
- **Timed test:** 54 questions sampled from the 168-question bank, 60 minutes,
  at least one question from every objective area, feedback only after
  submission. This is a custom practice format, not the official exam's question
  count, objective weighting, or passing standard. All correct selections are
  required; there is no partial credit.
- **Review:** see a topic breakdown and every explanation; retry missed or
  unanswered questions. Unchecked learning answers count as unanswered in the
  session score but do not add to lifetime answer-attempt statistics.
- **Resources:** official objectives, study guide, sample question formats,
  and hands-on tutorials. Cloud tutorials can incur charges; review plans
  and clean up resources.

Progress and an active session are stored in browser `localStorage` under
`terraprep-v1`. A timed session's deadline persists across navigation and reloads;
time away counts. An expired test submits when the app is open again. Use one
tab at a time: concurrent tabs are not synchronized. Browser storage is scoped
to the URL origin; a different port, browser, or `file:` URL may use different
storage. Private browsing or disabled storage can prevent persistence; the app
displays storage errors. Reset progress clears only this app's data.

All app assets are local. A running local server can serve them without internet;
this app does not provide a service-worker offline cache. External learning
links require internet access. No analytics or user data is
sent to a server.

## Content sources

Scope checked on **November 7, 2026**: the official Associate (004) guide states
that the exam targets **Terraform 1.12** and includes HCP Terraform.
Check the certification site before booking because exam content can change.

- [Certification overview](https://developer.hashicorp.com/certifications/terraform-associate)
- [Official 004 study guide](https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-study-004)
- [Official objective checklist](https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004)
- [Public sample question formats](https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-questions-004)
- [Sensitive and ephemeral data](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)

Every practice question in [questions.json](./questions.json) has its own
supporting HashiCorp documentation link. These are original educational
scenarios, not copied public samples, proprietary question banks, or leaked exam
dumps. Coverage does not imply exhaustive preparation or predict exam results.

### Independent practice reference

[OpenExamPrep: Terraform Associate](https://open-exam-prep.com/practice/terraform-associate)
was reviewed on November 7, 2026 and is linked in the study library. Its public
overview advertises 215+ free practice questions and describes the same eight
004 objective areas, Terraform 1.12, and HCP Terraform. The overview recommends
reviewing explanations, revisiting weak areas, and combining practice with
hands-on work.

The page's pass-rate estimates and suggested practice-score targets are
third-party advice, not official thresholds or guarantees. We subsequently
reviewed the concepts in its 215 public question prompts against our existing
bank, verified selected missing concepts using HashiCorp documentation, and
authored 48 new questions. This was a concept-gap review, not a certification of
every external answer. No external question text, options, or explanations were
imported or paraphrased; our bank now contains 168 original questions.
Terraform language and CLI references target 1.12; HCP references follow its
current service documentation. Terraform tests are explicitly marked as
supplementary learning, not an explicit 004 subobjective. Consult official
HashiCorp documentation when answers disagree.

## Maintaining the JSON bank

[questions.json](./questions.json) is the single data source, with `version: 1`,
`topics`, and `questions` arrays. JSON supports nested choices, multiple correct
answers, and escaped code snippets without CSV delimiter ambiguity. No build or
JavaScript editing is needed to add content.

Each question has:

- `id`: unique, stable lowercase letters/digits/hyphens, e.g. `workflow-16`.
- `topic`: one of the topic IDs; `objective`: an official code such as `3b`.
- `prompt`, `options`: question text and distinct answer strings.
- `answers`: zero-based correct option indices; all selections must match.
- `explanation`, `source`: reasoning and a `/terraform/...` documentation path.
- Optional `code`: an HCL snippet, with newlines escaped as `\n`.

The 168-question distribution is IaC 14, fundamentals 16, workflow 17,
configuration 52, modules 14, state 18, maintenance 15, and HCP Terraform 22.
This distribution and timed-test sampling are not official exam weightings.

[question-bank.js](./question-bank.js) validates the complete JSON bank before
the app restores progress. HTTP, parsing, or schema failures display an error,
disable practice, and leave saved progress untouched. All pre-expansion 120 question
IDs and answer ordering are preserved; additions need no storage migration.
Bump the storage schema and provide a migration before changing existing IDs,
options, or answers. Previously active tests keep their original question set.

Run the dependency-free content tests before deploying:

```sh
python3 -m unittest discover -s tests -v
```

Tests check coverage, uniqueness, answer indices, documentation paths, and the
original question ordering's compatibility fingerprint and all 120 pre-expansion
entries, plus the 48 documentation-review additions. Browser validation
should also cover JSON loading failures, existing progress restoration,
learning feedback, and 54-question timed sessions. Deploy with `sh deploy.sh`;
the optional temporary NodePort remains separate and unchanged.
# terraprep
# terraprep
