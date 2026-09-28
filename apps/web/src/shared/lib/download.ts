export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv',
): void {
  const blob = new Blob([`\uFEFF${content}`], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
