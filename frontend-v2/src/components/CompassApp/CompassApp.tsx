import { useEffect, useMemo } from "react";

import type { AppBrowserOutputCategory } from "../AppBrowser";
import { AppView, type AppViewProps } from "../AppView";
import { Button, type ButtonProps } from "../Button";
import { useClientStateSlice, type ClientStateSlice } from "../../state";
import styles from "./CompassApp.module.css";

export type CompassAppProps = Omit<
  AppViewProps,
  "children" | "componentName" | "title"
> & {
  categories: AppBrowserOutputCategory[];
  reorderButtonProps?: Omit<ButtonProps, "aria-label" | "children" | "onClick">;
};

export function CompassApp({
  categories,
  reorderButtonProps,
  ...appViewProps
}: CompassAppProps) {
  const selectedSayings = useMemo(
    () => categories.flatMap((category) => category.sayings),
    [categories],
  );
  const [order, setOrder] = useClientStateSlice(compassOrderSlice);
  const effectiveOrder = reconcileCompassOrder(order, selectedSayings);

  useEffect(() => {
    if (!sameOrder(order, effectiveOrder)) setOrder(effectiveOrder);
  }, [effectiveOrder, order, setOrder]);

  const sayingById = new Map(selectedSayings.map((saying) => [saying.id, saying]));
  const orderedSayings = effectiveOrder
    .map((id) => sayingById.get(id))
    .filter((saying): saying is AppBrowserOutputCategory["sayings"][number] => (
      Boolean(saying)
    ));

  return (
    <AppView
      {...appViewProps}
      componentName="CompassApp"
      defaultDataSource="_system/Compass"
      title="COMPASS"
    >
      <ol className={styles.list}>
        {orderedSayings.map((saying, index) => (
          <li key={saying.id} className={styles.item}>
            <span className={styles.position} aria-label={`Position ${index + 1}`}>
              {index + 1}.
            </span>
            <span className={styles.saying}>{saying.text}</span>
            <div className={styles.actions}>
              <Button
                {...reorderButtonProps}
                aria-label={`Move ${saying.text} up`}
                disabled={index === 0}
                onClick={() => setOrder(moveCompassSaying(
                  effectiveOrder,
                  saying.id,
                  -1,
                ))}
              >
                ↑
              </Button>
              <Button
                {...reorderButtonProps}
                aria-label={`Move ${saying.text} down`}
                disabled={index === orderedSayings.length - 1}
                onClick={() => setOrder(moveCompassSaying(
                  effectiveOrder,
                  saying.id,
                  1,
                ))}
              >
                ↓
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </AppView>
  );
}

const compassOrderSlice: ClientStateSlice<string[]> = {
  name: "appViews.CompassApp.sayingOrder",
  version: 1,
  defaultValue: [],
  validate: (value): value is string[] => (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  ),
};

function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length
    && left.every((id, index) => id === right[index]);
}

export function reconcileCompassOrder(
  current: readonly string[],
  sayings: readonly { id: string }[],
) {
  const selectedIds = new Set(sayings.map(({ id }) => id));
  const retained = current.filter((id) => selectedIds.delete(id));
  return [...retained, ...sayings.map(({ id }) => id).filter((id) => selectedIds.has(id))];
}

export function moveCompassSaying(
  current: readonly string[],
  sayingId: string,
  direction: -1 | 1,
) {
  const index = current.indexOf(sayingId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return [...current];
  const next = [...current];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}
