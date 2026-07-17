import { ConfigService } from "../services/ConfigService";

const configService = new ConfigService();

console.log("==================================");
console.log("CONFIG SERVICE TEST");
console.log("==================================");

console.log("\nTest 1 - List Configurations");

const configurations = configService.getAll();

console.table(configurations);

if (configurations.length === 0) {
    throw new Error(
        "TEST FAILED: Configuration list should not be empty."
    );
}

console.log("\nTest 2 - Get Configuration");

const concurrency = configService.get(
    "worker_concurrency"
);

console.log(concurrency);

if (!concurrency) {
    throw new Error(
        "TEST FAILED: worker_concurrency configuration not found."
    );
}

console.log("\nTest 3 - Get Numeric Configuration");

const concurrencyValue = configService.getNumber(
    "worker_concurrency"
);

console.log(
    "Worker concurrency:",
    concurrencyValue
);

if (
    !Number.isInteger(concurrencyValue) ||
    concurrencyValue < 1
) {
    throw new Error(
        "TEST FAILED: Invalid worker concurrency."
    );
}

console.log("\nTest 4 - Update Configuration");

const originalValue = concurrency.value;

configService.set(
    "worker_concurrency",
    "4"
);

const updatedConfig = configService.get(
    "worker_concurrency"
);

console.log(updatedConfig);

if (updatedConfig.value !== "4") {
    throw new Error(
        "TEST FAILED: Configuration was not updated."
    );
}

console.log("\nTest 5 - Invalid Configuration Key");

try {
    configService.set(
        "invalid_config_key",
        "10"
    );

    throw new Error(
        "TEST FAILED: Invalid configuration key was accepted."
    );
} catch (error) {
    if (
        error instanceof Error &&
        error.message.startsWith("TEST FAILED")
    ) {
        throw error;
    }

    console.log(
        "Invalid key correctly rejected."
    );
}

console.log("\nTest 6 - Invalid Configuration Value");

try {
    configService.set(
        "worker_concurrency",
        "0"
    );

    throw new Error(
        "TEST FAILED: Invalid configuration value was accepted."
    );
} catch (error) {
    if (
        error instanceof Error &&
        error.message.startsWith("TEST FAILED")
    ) {
        throw error;
    }

    console.log(
        "Invalid value correctly rejected."
    );
}

console.log("\nTest 7 - Restore Original Configuration");

configService.set(
    "worker_concurrency",
    originalValue
);

const restoredConfig = configService.get(
    "worker_concurrency"
);

if (restoredConfig.value !== originalValue) {
    throw new Error(
        "TEST FAILED: Original configuration was not restored."
    );
}

console.log(
    `worker_concurrency restored to ${originalValue}.`
);

console.log("\n==================================");
console.log("CONFIG SERVICE TEST PASSED");
console.log("==================================");