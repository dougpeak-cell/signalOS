import CryptoBoard from "@/components/crypto/CryptoBoard";
import { MEME_CRYPTO_BOARD } from "@/lib/crypto/catalog";

export default function MemeCryptoPage() {
  return <CryptoBoard config={MEME_CRYPTO_BOARD} />;
}