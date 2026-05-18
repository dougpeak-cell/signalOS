import CryptoBoard from "@/components/crypto/CryptoBoard";
import { DEFI_CRYPTO_BOARD } from "@/lib/crypto/catalog";

export default function DeFiCryptoPage() {
  return <CryptoBoard config={DEFI_CRYPTO_BOARD} />;
}