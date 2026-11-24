import { redirect } from "next/navigation";

export default async function PullbackWatchPage({ searchParams }: {
  searchParams?: Promise<{ previewPlan?: string; mobilePreview?: string }>;
}): Promise<never> {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params?.previewPlan) query.set("previewPlan", params.previewPlan);
  if (params?.mobilePreview) query.set("mobilePreview", params.mobilePreview);
  redirect(`/alerts${query.size ? `?${query}` : ""}`);
}
