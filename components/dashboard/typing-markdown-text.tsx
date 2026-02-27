"use client";

import { Fragment, useMemo } from "react";
import { parseMarkdown, getPlainText } from "@/lib/parse-markdown";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { cn } from "@/lib/utils";

interface TypingMarkdownTextProps {
  text: string;
  speed?: number;
}

export function TypingMarkdownText({
  text,
  speed = 15,
}: TypingMarkdownTextProps) {
  const segments = useMemo(() => parseMarkdown(text), [text]);
  const plainText = useMemo(() => getPlainText(text), [text]);
  const { displayedText, isComplete } = useTypingEffect(plainText, speed);

  const offset = displayedText.length;

  let consumed = 0;

  return (
    <>
      {segments.map((seg, i) => {
        const segStart = consumed;
        const segLen = seg.text.length;
        const visibleLen = Math.min(Math.max(offset - segStart, 0), segLen);
        consumed += segLen;

        const visible = seg.text.slice(0, visibleLen);
        const hidden = seg.text.slice(visibleLen);
        const showCursor =
          !isComplete && offset >= segStart && offset < segStart + segLen;

        return (
          <Fragment key={i}>
            {visible && (
              <span
                className={cn(
                  "text-foreground",
                  seg.bold && "font-semibold text-emphasis"
                )}
              >
                {visible}
              </span>
            )}
            {showCursor && (
              <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary" />
            )}
            {hidden && (
              <span
                className={cn(
                  "text-transparent",
                  seg.bold && "font-semibold"
                )}
              >
                {hidden}
              </span>
            )}
          </Fragment>
        );
      })}
      {isComplete
        ? null
        : offset >= consumed && (
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-primary" />
          )}
    </>
  );
}
