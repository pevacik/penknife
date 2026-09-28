import { httpClient } from '@/shared/api/httpClient';

export function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return httpClient.upload<{ url: string }>('/uploads', formData);
}
