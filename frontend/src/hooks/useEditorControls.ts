import { useRef, useState, type RefObject } from "react";

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getWords(value: string) {
  return Array.from(value.matchAll(/\S+/g), (match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

export function useEditorControls(
  editorRef: RefObject<HTMLTextAreaElement | null>,
  onValueChange: (value: string) => void,
) {
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const [dictating, setDictating] = useState(false);
  function moveCursor(direction: -1 | 1) {
    const input = editorRef.current;
    if (!input) return;
    const nextPosition = Math.max(0, Math.min(input.value.length, input.selectionStart + direction));
    input.focus({ preventScroll: true });
    input.setSelectionRange(nextPosition, nextPosition);
  }

  function selectWord() {
    const input = editorRef.current;
    if (!input) return;
    const words = getWords(input.value);
    if (words.length === 0) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.focus({ preventScroll: true });

    if (start !== end) {
      const firstSelectedWord = words.findIndex((word) => word.end > start);
      let lastSelectedWord = firstSelectedWord;
      for (let index = words.length - 1; index >= 0; index -= 1) {
        if (words[index].start < end) {
          lastSelectedWord = index;
          break;
        }
      }
      const nextFirst = Math.max(0, firstSelectedWord - 1);
      const nextLast = Math.min(words.length - 1, lastSelectedWord + 1);
      input.setSelectionRange(words[nextFirst].start, words[nextLast].end);
      return;
    }

    const nearestWord = words.find((word) => start >= word.start && start <= word.end) ??
      words.reduce((nearest, word) => {
        const nearestDistance = Math.min(Math.abs(start - nearest.start), Math.abs(start - nearest.end));
        const wordDistance = Math.min(Math.abs(start - word.start), Math.abs(start - word.end));
        return wordDistance < nearestDistance ? word : nearest;
      }, words[0]);
    input.setSelectionRange(nearestWord.start, nearestWord.end);
  }

  function dictate() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const input = editorRef.current;
    input?.focus({ preventScroll: true });
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition || !input) return;

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    setDictating(true);
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    const originalValue = input.value;
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;
    const segments = new Map<number, string>();
    recognition.onresult = (event) => {
      for (const index of segments.keys()) {
        if (index >= event.results.length) segments.delete(index);
      }
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        segments.set(index, event.results[index]?.[0]?.transcript ?? "");
      }
      const transcript = mergeSpeechSegments([...segments.entries()].sort(([left], [right]) => left - right).map(([, text]) => text));
      const nextValue = `${originalValue.slice(0, selectionStart)}${transcript}${originalValue.slice(selectionEnd)}`;
      onValueChange(nextValue);
      requestAnimationFrame(() => {
        const nextCursor = selectionStart + transcript.length;
        input.focus({ preventScroll: true });
        input.setSelectionRange(nextCursor, nextCursor);
      });
    };
    const finish = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setDictating(false);
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    recognition.start();
  }

  return { moveCursor, selectWord, dictate, dictating };
}

function mergeSpeechSegments(segments: string[]) {
  const words: string[] = [];
  for (const segment of segments) {
    const nextWords = segment.trim().split(/\s+/).filter(Boolean);
    let overlap = Math.min(words.length, nextWords.length);
    while (overlap > 0) {
      const tail = words.slice(-overlap).join(" ").toLocaleLowerCase();
      const head = nextWords.slice(0, overlap).join(" ").toLocaleLowerCase();
      if (tail === head) break;
      overlap -= 1;
    }
    words.push(...nextWords.slice(overlap));
  }
  return words.join(" ");
}
