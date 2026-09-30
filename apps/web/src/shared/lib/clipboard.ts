export function readImageFilesFromClipboard(event: {
  clipboardData: DataTransfer | null;
}): File[] {
  const files: File[] = [];
  const items = event.clipboardData?.items;

  if (items) {
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  }

  if (files.length === 0 && event.clipboardData?.files) {
    for (const file of Array.from(event.clipboardData.files)) {
      if (file.type.startsWith('image/')) {
        files.push(file);
      }
    }
  }

  return files;
}