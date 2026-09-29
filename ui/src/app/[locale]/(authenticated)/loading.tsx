// Prefix'siz agactaki loading.tsx'in aynasi. Bu dosya YOKKEN /tr ve /en-US altindaki
// sayfalar akisli iskelet alamiyordu: HomePage'in await ettigi API cevabi gelmeden tarayiciya
// tek bayt HTML inmiyor, kullanici (ozellikle /tr'ye yonlendirilen Turkce ziyaretci) API yavas
// oldugunda saniyelerce BOS sayfa goruyordu. Kok yol (/) ayni sayfayi loading.tsx ile
// serviyordu, fark buradan geliyordu.
export { default } from "../../(authenticated)/loading";
