import { Suspense } from "react";
import AuthConfirm from "@/components/auth/AuthConfirm";

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirm />
    </Suspense>
  );
}