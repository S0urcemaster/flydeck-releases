import type { FunctionBrowserOutputCategory } from "../FunctionBrowser";
import { FunctionView, type FunctionViewProps } from "../FunctionView";
import styles from "./CompassView.module.css";

export type CompassViewProps = Omit<
  FunctionViewProps,
  "children" | "componentName" | "title"
> & {
  categories: FunctionBrowserOutputCategory[];
};

export function CompassView({ categories, ...functionViewProps }: CompassViewProps) {
  return (
    <FunctionView
      {...functionViewProps}
      componentName="CompassView"
      title="COMPASS"
    >
      {categories.map((category) => (
        <div key={category.id} className={styles.category}>
          <div>{category.label}</div>
          <ul>
            {category.sayings.map((saying) => (
              <li key={saying.id}>{saying.text}</li>
            ))}
          </ul>
        </div>
      ))}
    </FunctionView>
  );
}
