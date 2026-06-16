import TodayActionRowClient from "@/components/today/TodayActionRowClient";
import { getTodayPageData } from "@/lib/today/pageData";

export default async function TodayActionRow() {
  const pageData = await getTodayPageData();
  const initialSetups =
    pageData.defaultSetupSession === "pre"
      ? pageData.preMarketTopSetups
      : pageData.topSetups;
  const initialUpdatedAt = Date.now();

  return (
    <TodayActionRowClient
      initialSetups={initialSetups}
      initialUpdatedAt={initialUpdatedAt}
    />
  );
}