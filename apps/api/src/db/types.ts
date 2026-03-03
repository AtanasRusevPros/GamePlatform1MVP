import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

export type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export interface DatabaseQueryResult<TRow extends QueryResultRow> {
  rows: TRow[];
  rowCount: number | null;
}

export function normalizeQueryResult<TRow extends QueryResultRow>(result: QueryResult<TRow>): DatabaseQueryResult<TRow> {
  return {
    rows: result.rows,
    rowCount: result.rowCount
  };
}

