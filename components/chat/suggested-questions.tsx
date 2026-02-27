"use client";

import { Button } from "@/components/ui/button";

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-muted-foreground text-center">
        무엇이든 물어보세요
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
            className="text-[11px] h-auto py-1.5 px-3 whitespace-normal text-left"
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}
