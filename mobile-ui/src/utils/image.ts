import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.gghub.social';

/** Avatar 28-64 px'lik dairelerde gösteriliyor; 512 px her ekran yoğunluğu için yeterli. */
export const AVATAR_MAX_EDGE = 512;
/** Kapak görseli profilde tam genişlikte. */
export const HEADER_MAX_EDGE = 1600;

/**
 * ImagePicker'dan gelen görseli yüklemeden önce küçültür.
 *
 * `launchImageLibraryAsync` yalnızca `quality` kabul ediyor, boyut sınırı yok: modern bir
 * telefon fotoğrafının kırpılmışı 2-3 bin piksel olarak, megabaytlarca veriyle yükleniyordu.
 * Sunucu tarafında da ayrıca tavan var (PhotoService), burası kullanıcının mobil verisini
 * ve yükleme süresini korumak için.
 *
 * Zaten küçük olan görsel büyütülmez. Hata durumunda orijinal uri döner: küçültme
 * başarısız diye yükleme iptal olmasın.
 */
export const shrinkForUpload = async (
  asset: { uri: string; width?: number; height?: number },
  maxEdge: number
): Promise<string> => {
  const longestEdge = Math.max(asset.width ?? 0, asset.height ?? 0);
  if (longestEdge > 0 && longestEdge <= maxEdge) {
    return asset.uri;
  }

  try {
    const isPortrait = (asset.height ?? 0) > (asset.width ?? 0);
    const context = ImageManipulator.manipulate(asset.uri).resize(
      isPortrait ? { height: maxEdge } : { width: maxEdge }
    );
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    return asset.uri;
  }
};

export const getImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (API_BASE.endsWith('/') && path.startsWith('/')) {
    return `${API_BASE}${path.substring(1)}`;
  }

  return `${API_BASE}${path}`;
};
