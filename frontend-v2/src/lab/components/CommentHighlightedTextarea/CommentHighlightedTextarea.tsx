import { useState } from "react";

import {
  Textarea,
  type TextareaProps,
} from "../../../components/Textarea";
import styles from "./CommentHighlightedTextarea.module.css";

export type CommentHighlightedTextareaProps = TextareaProps;

export function CommentHighlightedTextarea({
  className,
  onScroll,
  value,
  ...props
}: CommentHighlightedTextareaProps) {
  const [scrollOffset, setScrollOffset] = useState({ left: 0, top: 0 });
  const text = String(value ?? "");
  const classes = className
    ? `${styles.textarea} ${className}`
    : styles.textarea;

  return (
    <div className={styles.editor}>
      <pre
        className={styles.commentHighlights}
        style={{
          transform:
            `translate(${-scrollOffset.left}px, ${-scrollOffset.top}px)`,
        }}
        aria-hidden="true"
      >
        {text.split("\n").map((line, index) => (
          <span
            data-comment={line.trimStart().startsWith("#")}
            key={`${index}-${line}`}
          >
            {line || "\u200b"}
          </span>
        ))}
      </pre>
      <Textarea
        {...props}
        className={classes}
        value={value}
        onScroll={(event) => {
          setScrollOffset({
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          });
          onScroll?.(event);
        }}
      />
    </div>
  );
}
