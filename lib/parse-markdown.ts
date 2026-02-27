export interface TextSegment {
  text: string;
  bold: boolean;
}

/**
 * **text** 마크다운을 세그먼트 배열로 변환
 */
export function parseMarkdown(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false });
  }

  return segments;
}

/**
 * 마크다운 마커를 제거한 plain text 반환
 */
export function getPlainText(raw: string): string {
  return raw.replace(/\*\*(.*?)\*\*/g, "$1");
}
