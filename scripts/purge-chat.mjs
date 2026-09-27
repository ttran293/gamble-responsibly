import pg from "pg";

if (!process.env.TIMESCALE_SERVICE_URL) throw new Error("TIMESCALE_SERVICE_URL is required");
const client = new pg.Client({ connectionString: process.env.TIMESCALE_SERVICE_URL });
try {
  await client.connect();
  const result = await client.query("DELETE FROM chat_threads WHERE updated_at < now() - interval '90 days' AND (pending_token IS NULL OR pending_at < now() - interval '45 seconds')");
  console.log(`Deleted ${result.rowCount ?? 0} expired chat conversations.`);
} finally {
  await client.end();
}
