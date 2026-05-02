import { fetchLatestSignals } from "@/lib/queries/signals";

export default async function Test() {
  const rows = await fetchLatestSignals();
  console.log(rows);
  return <pre>{JSON.stringify(rows, null, 2)}</pre>;
}
