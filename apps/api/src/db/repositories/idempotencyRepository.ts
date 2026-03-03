import type { Queryable } from "../types.js";

interface IdempotencyRow {
  scope: string;
  idempotency_key: string;
  response_json: unknown;
  status_code: number;
}

export interface StoredIdempotencyResponse<TResponse> {
  statusCode: number;
  response: TResponse;
}

export class IdempotencyRepository {
  constructor(private readonly db: Queryable) {}

  async find<TResponse>(scope: string, idempotencyKey: string): Promise<StoredIdempotencyResponse<TResponse> | undefined> {
    const result = await this.db.query<IdempotencyRow>(
      `
        select scope, idempotency_key, response_json, status_code
        from idempotency_keys
        where scope = $1 and idempotency_key = $2
      `,
      [scope, idempotencyKey]
    );

    const row = result.rows[0];

    if (!row) {
      return undefined;
    }

    return {
      statusCode: row.status_code,
      response: row.response_json as TResponse
    };
  }

  async save<TResponse>(scope: string, idempotencyKey: string, statusCode: number, response: TResponse): Promise<void> {
    await this.db.query(
      `
        insert into idempotency_keys (scope, idempotency_key, status_code, response_json)
        values ($1, $2, $3, $4::jsonb)
        on conflict (scope, idempotency_key) do nothing
      `,
      [scope, idempotencyKey, statusCode, JSON.stringify(response)]
    );
  }
}

