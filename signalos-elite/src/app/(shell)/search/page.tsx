import { redirect } from "next/navigation";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const query = q ? `?q=${encodeURIComponent(q)}` : "";

  redirect(`/screener${query}`);
}
