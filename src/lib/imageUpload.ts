import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Reduz e otimiza a imagem no navegador (máx 1200px, WebP/JPEG 82%)
 * antes de enviar para o bucket `roma-imagens` no Supabase.
 */
export async function compressAndUploadImage(file: File, folder = 'produtos'): Promise<string> {
  const compressedBlob = await compressImage(file, 1200, 0.82);

  if (isSupabaseConfigured && supabase) {
    const ext = compressedBlob.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('roma-imagens')
      .upload(fileName, compressedBlob, { contentType: compressedBlob.type, upsert: true });

    if (!error) {
      const { data } = supabase.storage.from('roma-imagens').getPublicUrl(fileName);
      return data.publicUrl;
    }
  }

  // Fallback local caso Supabase ainda não esteja conectado
  return await blobToDataUrl(compressedBlob);
}

function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/webp',
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
