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
  editorRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  onValueChange: (value: string) => void,
) {
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const [dictating, setDictating] = useState(false);
  function moveCursor(direction: -1 | 1) {
    const input = editorRef.current;
    if (!input) return;
    const nextPosition = Math.max(0, Math.min(input.value.length, (input.selectionStart ?? input.value.length) + direction));
    input.focus({ preventScroll: true });
    input.setSelectionRange(nextPosition, nextPosition);
  }

  function selectWord() {
    const input = editorRef.current;
    if (!input) return;
    const words = getWords(input.value);
    if (words.length === 0) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
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

  function dictate(
    targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null> = editorRef,
    targetOnValueChange: (value: string) => void = onValueChange,
  ) {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const input = targetRef.current;
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
    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const segments = new Map<number, string>();
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      for (const index of segments.keys()) {
        if (index >= event.results.length) segments.delete(index);
      }
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        segments.set(index, event.results[index]?.[0]?.transcript ?? "");
      }
      const transcript = mergeSpeechSegments([...segments.entries()].sort(([left], [right]) => left - right).map(([, text]) => text));
      const nextValue = `${originalValue.slice(0, selectionStart)}${transcript}${originalValue.slice(selectionEnd)}`;
      targetOnValueChange(nextValue);
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

export function mergeSpeechSegments(segments: string[]) {
  const words: string[] = [];
  for (const segment of segments) {
    const nextWords = segment.trim().split(/\s+/).filter(Boolean);
    if (nextWords.length === 0) continue;
    const normalizedWords = words.map(normalizeSpeechWord);
    const normalizedNextWords = nextWords.map(normalizeSpeechWord);
    let commonPrefix = 0;
    while (
      commonPrefix < normalizedWords.length
      && commonPrefix < normalizedNextWords.length
      && normalizedWords[commonPrefix] === normalizedNextWords[commonPrefix]
    ) {
      commonPrefix += 1;
    }
    const cumulativeThreshold = Math.min(2, normalizedWords.length, normalizedNextWords.length);
    if (cumulativeThreshold > 0 && commonPrefix >= cumulativeThreshold) {
      words.splice(0, words.length, ...nextWords);
      continue;
    }
    let overlap = Math.min(words.length, nextWords.length);
    while (overlap > 0) {
      const tail = normalizedWords.slice(-overlap);
      const head = normalizedNextWords.slice(0, overlap);
      if (tail.every((word, index) => word === head[index])) break;
      overlap -= 1;
    }
    words.push(...nextWords.slice(overlap));
  }
  return words.join(" ");
}

function normalizeSpeechWord(word: string) {
  return word.normalize("NFKC").toLocaleLowerCase("de").replace(/[^\p{L}\p{N}]+/gu, "");
}
