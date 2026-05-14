function extractFileName(contentDispositionHeader: string | null): string | undefined {
  if (!contentDispositionHeader) {
    return undefined;
  }

  const utf8Match = contentDispositionHeader.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = contentDispositionHeader.match(/filename="([^"]+)"/i);

  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = contentDispositionHeader.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim();
}

export function resolveGeneratedFileName(
  contentDispositionHeader: string | null,
  fallbackFileName: string,
): string {
  return extractFileName(contentDispositionHeader) ?? fallbackFileName;
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
