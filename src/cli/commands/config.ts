import { Command } from "commander";
import { ConfigService } from "../../services/ConfigService";

const CONFIG_ALIASES: Record<string, string> = {
    "max-retries": "default_max_retries",
    "retry-backoff": "base_retry_delay_ms",
    "worker-concurrency": "worker_concurrency",
    "poll-interval": "poll_interval_ms"
};

function resolveConfigKey(key: string): string {
    return CONFIG_ALIASES[key] ?? key;
}

export function registerConfigCommand(
    program: Command
): void {

    const config = program
        .command("config")
        .description(
            "Manage QueueCTL configuration"
        );

    config
        .command("list")
        .description(
            "List all configuration values"
        )
        .action(() => {
            try {
                const configService =
                    new ConfigService();

                const configurations =
                    configService.getAll();

                console.table(
                    configurations.map(
                        (item) => ({
                            Key: item.key,
                            Value: item.value,
                            Updated:
                                item.updated_at
                        })
                    )
                );

            } catch (error) {
                if (error instanceof Error) {
                    console.error(
                        error.message
                    );
                } else {
                    console.error(
                        "Unknown error."
                    );
                }
            }
        });

    config
        .command("get")
        .description(
            "Get a configuration value"
        )
        .argument(
            "<key>",
            "Configuration key"
        )
        .action((key: string) => {
            try {
                const configService =
                    new ConfigService();

                const resolvedKey =
                    resolveConfigKey(key);

                const configuration =
                    configService.get(
                        resolvedKey
                    );

                console.log(
                    `${key} = ${configuration.value}`
                );

            } catch (error) {
                if (error instanceof Error) {
                    console.error(
                        error.message
                    );
                } else {
                    console.error(
                        "Unknown error."
                    );
                }
            }
        });

    config
        .command("set")
        .description(
            "Set a configuration value"
        )
        .argument(
            "<key>",
            "Configuration key"
        )
        .argument(
            "<value>",
            "Configuration value"
        )
        .action((
            key: string,
            value: string
        ) => {
            try {
                const configService =
                    new ConfigService();

                const resolvedKey =
                    resolveConfigKey(key);

                configService.set(
                    resolvedKey,
                    value
                );

                console.log(
                    `Configuration '${key}' updated to '${value}'.`
                );

            } catch (error) {
                if (error instanceof Error) {
                    console.error(
                        error.message
                    );
                } else {
                    console.error(
                        "Unknown error."
                    );
                }
            }
        });
}