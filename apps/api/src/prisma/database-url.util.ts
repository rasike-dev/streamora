/**
 * Append Prisma pool settings for Cloud Run + Cloud SQL.
 * Budget: (api_max_instances × limit) + (worker_instances × worker_limit) < max_connections.
 */
export function withPrismaPoolParams(
  url: string | undefined,
  connectionLimit: number,
): string | undefined {
  if (!url) return undefined;
  if (/connection_limit=/.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connection_limit=${connectionLimit}&pool_timeout=30`;
}
