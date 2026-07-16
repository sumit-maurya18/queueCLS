import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATABASE_PATH = path.resolve(
    process.cwd(),
    "database",
    "queuectl.db"
);

const SCHEMA_PATH = path.resolve(
    process.cwd(),
    "src",
    "database",
    "schema.sql"
);

const database = new Database(DATABASE_PATH);

const schema = fs.readFileSync(
    SCHEMA_PATH,
    "utf-8"
);

database.exec(schema);

export default database;

