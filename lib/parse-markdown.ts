export interface TextSegment {
  text: string;
  bold: boolean;
  highlight: boolean;
}

/**
 * **bold** + ==highlight== 마크다운을 세그먼트 배열로 변환
 * 중첩 지원: **==bold+highlight==**
 */
export function parseMarkdown(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // **bold**, ==highlight==, **==both==** 순서로 매칭
  const regex = /\*\*==(.*?)==\*\*|==\*\*(.*?)\*\*==|\*\*(.*?)\*\*|==(.*?)==/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: raw.slice(lastIndex, match.index), bold: false, highlight: false });
    }

    if (match[1] != null || match[2] != null) {
      // **==text==** or ==**text**== → bold + highlight
      segments.push({ text: match[1] ?? match[2], bold: true, highlight: true });
    } else if (match[3] != null) {
      // **text** → bold only
      segments.push({ text: match[3], bold: true, highlight: false });
    } else if (match[4] != null) {
      // ==text== → highlight only
      segments.push({ text: match[4], bold: false, highlight: true });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ text: raw.slice(lastIndex), bold: false, highlight: false });
  }

  return segments;
}

/**
 * 마크다운 마커를 제거한 plain text 반환
 */
export function getPlainText(raw: string): string {
  return raw.replace(/\*\*/g, "").replace(/==/g, "");
}
