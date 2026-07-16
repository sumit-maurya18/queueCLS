export class DuplicateJobError extends Error {

    constructor(id: string) {

        super(`Job with ID '${id}' already exists.`);

        this.name = "DuplicateJobError";

    }

}