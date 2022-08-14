import { logger } from './logger';
import fs from 'fs';
import { CronJob } from 'cron';
import { KubeConfig, CoreV1Api, V1Pod } from '@kubernetes/client-node';
import { parse } from 'yaml';
import path from 'path';

interface Config {
    targetNamespace: string;
    cronInterval: string;
}

const findAndDeletePods = async (
    k8sApi: CoreV1Api,
    namespace: string
): Promise<void> => {
    const childLogger = logger.child({ namespace });
    childLogger.info('Finding and Deleting Pods');

    try {
        let res = await k8sApi.listNamespacedPod(namespace);
        let podCount = res.body.items.length;

        if (podCount > 0) {
            // Pod metadata can easily be logged, but to keep clean, only the pod name is being logged

            let randomPod: V1Pod =
                res.body.items[Math.floor(Math.random() * podCount)];

            if (randomPod.metadata && randomPod.metadata.name) {
                let podName = randomPod.metadata.name;
                childLogger.info({ podName }, 'Deleting Pod');

                let result = await k8sApi.deleteNamespacedPod(
                    podName,
                    namespace
                );

                childLogger.info({ podName }, 'Successfully deleted Pod');
            }
        } else {
            childLogger.info('No Pods to delete');
        }
    } catch (error) {
        childLogger.error(error);
    }
};

const readConfig = (configPath: string): Config => {
    try {
        logger.info({ configPath }, 'Starting Config Read');
        // Read path relative to calling directory
        let resolvedPath = path.resolve('./', configPath);
        logger.info({ resolvedPath }, 'Resolved Path');
        let file = fs.readFileSync(resolvedPath, 'utf8');
        let config: Config = parse(file);

        if (!config.cronInterval || !config.targetNamespace) {
            throw new Error(
                'Missing cronInterval or targetNamespace in config'
            );
        }

        logger.info({ config, resolvedPath }, 'Successfully read config');
        return config;
    } catch (error) {
        logger.error(error, 'Failed to read config');
        throw error;
    }
};

const getClient = (): CoreV1Api => {
    const kc = new KubeConfig();
    kc.loadFromCluster();
    const k8sApi = kc.makeApiClient(CoreV1Api);
    return k8sApi;
};

const scheduleJob = async (cronString: string, scheduledFunction: Function) => {
    try {
        var job = new CronJob(
            cronString,
            async () => {
                await scheduledFunction();
                logger.info({ nextRun: job.nextDates() }, 'Job Scheduled');
            },
            null,
            true
        );
        logger.info({ nextRun: job.nextDates() }, 'Job Scheduled');
    } catch (error) {
        logger.error(error, 'Cron Scheduling Failed');
        throw error;
    }
};

const main = async () => {
    try {
        logger.info('Starting');
        // We set a default here for this example, but could throw if env var is not present
        let configPath = process.env.CONFIG_PATH || 'config/config.yaml';
        let config = await readConfig(configPath);
        let { targetNamespace, cronInterval } = config;
        let client = getClient();

        let task = () => findAndDeletePods(client, targetNamespace);

        scheduleJob(cronInterval, task);
    } catch (error) {
        logger.error(error, 'Task failed');
        process.exit(1);
    }
};

main();
