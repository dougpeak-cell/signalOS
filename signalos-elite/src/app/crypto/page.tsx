import CryptoBoard from "@/components/crypto/CryptoBoard";
import { DEFAULT_CRYPTO_BOARD } from "@/lib/crypto/catalog";

export default function CryptoPage() {
  return <CryptoBoard config={DEFAULT_CRYPTO_BOARD} />;
}