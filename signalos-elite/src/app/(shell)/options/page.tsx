import { Suspense } from "react";
import OptionsWorkspace from "@/components/options/OptionsWorkspace";

export default function OptionsPage(): React.JSX.Element {
  return <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading options research...</div>}><OptionsWorkspace /></Suspense>;
}