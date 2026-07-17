import fs from "node:fs";
import path from "node:path";

const TEST_DATABASE_PATH = path.resolve(
    process.cwd(),
    "tests",
    "database",
    "queuectl-test.db"
);

process.env.QUEUECTL_DATABASE_PATH =
    TEST_DATABASE_PATH;

if (fs.existsSync(TEST_DATABASE_PATH)) {
    fs.unlinkSync(TEST_DATABASE_PATH);
}