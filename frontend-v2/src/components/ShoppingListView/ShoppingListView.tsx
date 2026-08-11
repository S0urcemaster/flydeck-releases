import type { ShoppingListOutputCategory } from "../AppBrowser";
import { AppView, type AppViewProps } from "../AppView";
import styles from "./ShoppingListView.module.css";

export type ShoppingListViewProps = Omit<
  AppViewProps,
  "children" | "componentName" | "title"
> & {
  categories: ShoppingListOutputCategory[];
};

export function ShoppingListView({
  categories,
  ...appViewProps
}: ShoppingListViewProps) {
  return (
    <AppView
      {...appViewProps}
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
    </AppView>
  );
}
