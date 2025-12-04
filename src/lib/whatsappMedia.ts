import { createClient } from "@supabase/supabase-js";

export async function downloadAndUploadMedia({
  mediaUrl,
  mediaId,
  type,
  contactNumber,
  supabaseUrl,
  supabaseServiceKey,
  accessToken
}: {
  mediaUrl: string;
  mediaId: string;
  type: "audio" | "video" | "image" | "document";
  contactNumber: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  accessToken: string;
}): Promise<string | null> {
  try {
    // Paso 1: Llamar al nodo de media en Graph para obtener la URL de descarga
    // Ejemplo: GET https://graph.facebook.com/v18.0/{mediaId}?access_token=...
    console.log('[whatsappMedia] obtener metadata de media:', mediaUrl);
    const metaRes = await fetch(`${mediaUrl}?access_token=${accessToken}`);
    if (!metaRes.ok) {
      const text = await metaRes.text().catch(() => '');
      throw new Error(`No se pudo obtener metadata de media: ${metaRes.status} ${text}`);
    }
    const metaJson = await metaRes.json();
    const downloadUrl: string | undefined = metaJson?.url;
    if (!downloadUrl) throw new Error('No se encontró campo url en la metadata del media');

    // Paso 2: Descargar el binario desde la URL retornada por Graph
    console.log('[whatsappMedia] descargando binario desde:', downloadUrl);
    // Intento: incluir Authorization Bearer cuando tengamos accessToken (lookaside acepta header)
    const downloadHeaders: Record<string,string> = { 'Accept': '*/*' };
    if (accessToken) downloadHeaders['Authorization'] = `Bearer ${accessToken}`;
    let fileRes = await fetch(downloadUrl, { headers: downloadHeaders, redirect: 'follow' });
    // Si aún así falla por autenticación, intentar como fallback añadiendo access_token en query
    if (!fileRes.ok && (fileRes.status === 401 || fileRes.status === 403) && accessToken) {
      try {
        const u = new URL(downloadUrl);
        if (!u.searchParams.get('access_token')) u.searchParams.set('access_token', accessToken);
        const retryUrl = u.toString();
        console.log('[whatsappMedia] retry descargando con token en query (fallback):', retryUrl);
        fileRes = await fetch(retryUrl, { headers: { 'Accept': '*/*' }, redirect: 'follow' });
      } catch (e) {
        // ignore URL parse errors and fallthrough to error handling
      }
    }
    if (!fileRes.ok) {
      const txt = await fileRes.text().catch(() => '');
      throw new Error(`No se pudo descargar el binario desde lookaside: ${fileRes.status} ${txt}`);
    }

    // Obtener blob/arrayBuffer y content-type
    const arrayBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get('content-type') || undefined;
    const blob = new Blob([arrayBuffer], { type: contentType });

    // Determinar extensión preferente por content-type
    const extFromType = (() => {
      if (!contentType) return null;
      if (contentType.includes('audio/')) return contentType.split('/')[1].split('+')[0];
      if (contentType.includes('video/')) return contentType.split('/')[1].split('+')[0];
      if (contentType.includes('image/')) return contentType.split('/')[1].split('+')[0];
      if (contentType === 'application/pdf') return 'pdf';
      return null;
    })();

    const extMap: Record<string,string> = { audio: 'ogg', video: 'mp4', image: 'jpg', document: 'pdf' };
    const defaultExt = extMap[type] || 'bin';
    const ext = extFromType || defaultExt;
    const folder = type === 'document' ? 'file' : type;

    // Estructura: whatsapp-media/+(numero de contacto)/(audio|video|file)/mediaId.ext
    const filePath = `whatsapp-media/${contactNumber}/${folder}/${mediaId}.${ext}`;

    // Subir a Supabase Storage en el bucket 'ingenit' usando la service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[whatsappMedia] subiendo a supabase:', filePath);
    const { error } = await supabase.storage.from('ingenit').upload(filePath, blob as any, {
      upsert: true,
      contentType: contentType || undefined
    });
    if (error) throw error;
    return filePath;
  } catch (e) {
    console.error("Error en downloadAndUploadMedia:", e);
    return null;
  }
}
