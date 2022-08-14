# PodChaosMonkey

Using [Skaffold](https://skaffold.dev/) in order to both build and deploy the PodChaosMonkey and the dummy workload.

Both Kubernetes manifests are within the `k8s` directory using Kustomize. With the Typescript source code within `src`.

## Building

Everything is self contained within the `Dockerfile`.

Leveraging skaffold:

```sh
skaffold build
```

Or directly using docker:

```sh
docker build -t pod-chaos-monkey --target production .
```

## Running

### Local (in Cluster) Dev

First ensure your kubectl context is set to your local computer, then run the following:

```sh
skaffold dev
```

Will build and deploy all services (including the dummy service and namespace) and show logs in your terminal, and clean up on exit;

If you want both applications to persist, run the following (with `--tail` being optional):

```sh
skaffold run --tail
```

### K8s RBAC

The pod chaos monkey application is given a ClusterRole and binding via the default service account in the namespace to be able to delete pods across the cluster as this makes the most sense for a tool of this kind. Alternatively, a Role could be made in the dummmy-service manifest and a separate binding could be made in the chaos-monkey manifest to ensure that only that namespace could be accessed via the kubeernetes api server.

### Config

Cron syntax is the syntax supported by [node-cron](https://github.com/kelektiv/node-cron#available-cron-patterns).

```
Asterisk. E.g. *
Ranges. E.g. 1-3,5
Steps. E.g. */2
```

Use something like https://crontab.cronhub.io/ to preview when it will run.

The default config in `config/config.yaml` (used for local development) will run every 5 seconds, and the default configmap in `k8s/pod-chaos-monkey/config.yaml` will run every minute.

Only 2 fields are required in the yaml file:

```YAML
targetNamespace: workloads
cronInterval: "0/5 * * * * *"
```

## Local Dev

You will need node installed, and then the usual `npm ci` followed by `npm build` and then `npm start`. The tool is however designed to run in the cluster. The docker build is fast though and so having `skaffold dev` is a much better developer flow.

### Improvements/Ideas/TODO:

-   Write unit tests (that were time constrained)
-   Watch config.yml file and update without restart
-   Make config an array of namespaces rather than running multiple services
-   Target range percentage of pods to be terminated on each run
-   Refactor code to be more event driven with subscribers to various topics (config change, webhook hit) rather than direct invocation with callbacks
-   Create CLI version that can be called via a Kubernetes CronJob
-   Create API that allows parameterized instant invocation of the pod deletion
