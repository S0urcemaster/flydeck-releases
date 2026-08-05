import type { ShoppingListOutputCategory } from "../FunctionBrowser";
import { FunctionView, type FunctionViewProps } from "../FunctionView";
import styles from "./ShoppingListView.module.css";

export type ShoppingListViewProps = Omit<
  FunctionViewProps,
  "children" | "componentName" | "title"
> & {
  categories: ShoppingListOutputCategory[];
};

export function ShoppingListView({
  categories,
  ...functionViewProps
}: ShoppingListViewProps) {
  return (
    <FunctionView
      {...functionViewProps}
      componentName="ShoppingListView"
      title="SHOPPING LIST"
    >
      {categories.map((category) => (
        <div key={category.id} className={styles.category}>
          <div>{category.label}</div>
          <ul>
            {category.items.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        </div>
      ))}
    </FunctionView>
  );
}
