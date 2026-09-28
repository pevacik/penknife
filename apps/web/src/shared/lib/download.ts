export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
  withBom = true,
): void {
  const blob = new Blob([withBom ? `\uFEFF${content}` : content], {
    type: `${mimeType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
