
import { Dropbox } from 'dropbox';
import { getDropboxAccessToken } from './dropboxRefreshToken';

// Cliente Dropbox dinámico con access token actualizado
export async function getDbx() {
  const accessToken = await getDropboxAccessToken();
  return new Dropbox({ accessToken });
}

export async function uploadImage(file: File | Blob, path: string) {
  // path: '/nombre-archivo.ext' (debe empezar con /)
  let contents: any = file;
  if (typeof window !== 'undefined' && file instanceof File) {
    contents = await file.arrayBuffer();
  }
  const dbx = await getDbx();
  const response = await dbx.filesUpload({
    path,
    contents,
    mode: { ".tag": "overwrite" }
  });
  return response;
}

export async function getTemporaryLink(path: string) {
  // path: '/nombre-archivo.ext'
  const dbx = await getDbx();
  const response = await dbx.filesGetTemporaryLink({ path });
  return response.result.link;
}

export async function deleteFile(path: string) {
  // path: '/nombre-archivo.ext'
  const dbx = await getDbx();
  return dbx.filesDeleteV2({ path });
}
