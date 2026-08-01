import { Area } from 'react-easy-crop';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Kırpılan alanı hedef boyuta indirip WebP olarak döndürür.
 *
 * Öncesinde canvas kaynak piksel çözünürlüğünde açılıyor ve `toBlob`'a kalite verilmiyordu
 * (tarayıcı varsayılanı ~0.92). Telefon fotoğrafından kırpılan bir avatar 600 KB+ JPEG olarak
 * yükleniyor, ana sayfada 28-48 px'lik daireye basılıyordu. Sunucu tarafında da ayrıca tavan
 * var (PhotoService), bu istemci tarafı kısıt yüklemeyi ve bant genişliğini baştan azaltıyor.
 */
const DEFAULT_MAX_EDGE = 512;
const DEFAULT_QUALITY = 0.85;

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxEdge: number = DEFAULT_MAX_EDGE
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Küçük kırpmayı büyütme: yalnızca gerekiyorsa ölçekle.
  const scale = Math.min(1, maxEdge / Math.max(pixelCrop.width, pixelCrop.height));
  const targetWidth = Math.max(1, Math.round(pixelCrop.width * scale));
  const targetHeight = Math.max(1, Math.round(pixelCrop.height * scale));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve) => {
    const encode = (type: string, extension: string) =>
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // WebP desteklenmiyorsa JPEG'e düş (eski Safari).
            if (type === 'image/webp') {
              encode('image/jpeg', 'jpeg');
              return;
            }
            resolve(null);
            return;
          }
          resolve(new File([blob], `cropped-image.${extension}`, { type }));
        },
        type,
        DEFAULT_QUALITY
      );

    encode('image/webp', 'webp');
  });
}

/**
 * Kırpma OLMADAN yeniden boyutlandırma. Gönderi görselleri için: kullanıcı
 * bir kare seçmiyor, görseli olduğu gibi ekliyor, biz yalnızca uzun kenarı
 * sınırlıyoruz.
 *
 * getCroppedImg ile aynı kodlama yolu (WebP, düşerse JPEG) ama girdi bir
 * `File` ve çıktı da `File`; hata durumunda orijinal dosya aynen döner, çünkü
 * yüklemenin küçültme yüzünden hiç yapılamaması kullanıcı için daha kötü.
 */
export async function downscaleImage(file: File, maxEdge: number): Promise<File> {
  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await createImage(objectUrl);

      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      // Zaten yeterince küçükse yeniden kodlamaya değmez.
      if (scale === 1) return file;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise<File>((resolve) => {
        const encode = (type: string, extension: string) =>
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (type === 'image/webp') {
                  encode('image/jpeg', 'jpeg');
                  return;
                }
                resolve(file);
                return;
              }
              resolve(new File([blob], `post-image.${extension}`, { type }));
            },
            type,
            DEFAULT_QUALITY
          );

        encode('image/webp', 'webp');
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return file;
  }
}
