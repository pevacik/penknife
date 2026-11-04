import { httpClient } from './httpClient';

export function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return httpClient.upload<{ url: string }>('/uploads', formData);
}

/** Просит сервер скачать картинку по ссылке и сохранить её локально. */
export function importImageFromUrl(url: string): Promise<{ url: string }> {
  return httpClient.post<{ url: string }>('/uploads/from-url', { url });
}