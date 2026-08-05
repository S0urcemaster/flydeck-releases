import { RgbColorField } from "../RgbColorField";
import styles from "./ColorMapEditor.module.css";

export type ColorMapEditorEntry = {
  name: string;
  label: string;
  value: string;
};

export type ColorMapEditorProps = {
  entries: ColorMapEditorEntry[];
  onChange: (name: string, value: string) => void;
};

export function ColorMapEditor({ entries, onChange }: ColorMapEditorProps) {
  return (
    <section className={styles.root}>
      {entries.map((entry) => (
        <RgbColorField
          key={entry.name}
          label={entry.label}
          value={entry.value}
          onChange={(value) => onChange(entry.name, value)}
        />
      ))}
    </section>
  );
}
