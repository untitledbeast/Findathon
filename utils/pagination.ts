export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function buildPaginationMeta({ page, limit, total }: PaginationOptions): PaginationMeta {
  const pages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrevious: page > 1
  };
}
