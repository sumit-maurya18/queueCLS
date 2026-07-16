export interface QueueConfiguration {

    maxRetries: number;

    backoffBase: number;

    workerPollInterval: number;

}

export const DefaultConfiguration: QueueConfiguration = {

    maxRetries: 3,

    backoffBase: 2,

    workerPollInterval: 1000

};