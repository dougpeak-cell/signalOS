import CryptoBoard from "@/components/crypto/CryptoBoard";
import { RWA_CRYPTO_BOARD } from "@/lib/crypto/catalog";

export default function RwaCryptoPage() {
  return <CryptoBoard config={RWA_CRYPTO_BOARD} />;
}