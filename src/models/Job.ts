export interface Job {

    id: string;

    command: string;

    state: string;

    attempts: number;

    max_retries: number;

    last_error: string | null;

    next_retry_at: string | null;

    locked_by: string | null;

    locked_at: string | null;

    created_at: string;

    updated_at: string;

}