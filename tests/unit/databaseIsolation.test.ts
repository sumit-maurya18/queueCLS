import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import database from "../../src/database/database";

import {
    resetTestDatabase
} from "../helpers/testDatabase";

describe(
    "Automated Test Database Isolation",
    () => {

        beforeEach(() => {
            resetTestDatabase();
        });

        it(
            "should initialize the jobs table",
            () => {

                const result =
                    database
                        .prepare(`
                            SELECT name
                            FROM sqlite_master
                            WHERE
                                type = 'table'
                                AND name = 'jobs'
                        `)
                        .get();

                expect(result).toBeDefined();
            }
        );

        it(
            "should initialize the config table",
            () => {

                const result =
                    database
                        .prepare(`
                            SELECT name
                            FROM sqlite_master
                            WHERE
                                type = 'table'
                                AND name = 'config'
                        `)
                        .get();

                expect(result).toBeDefined();
            }
        );

        it(
            "should contain default configuration",
            () => {

                const configs =
                    database
                        .prepare(`
                            SELECT *
                            FROM config
                        `)
                        .all();

                expect(configs.length).toBe(4);
            }
        );
    }
);