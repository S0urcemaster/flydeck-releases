import {
  createContext,
  useEffect,
  useContext,
  useState,
  type CSSProperties,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
} from "react";

import styles from "./Base.module.css";
import { clientStateStore, selectedLabComponentSlice } from "../../state";

export const baseColors = [
  "inherit",
  "COLOR_TEXT",
  "COLOR_TEXT_MUTED",
  "COLOR_ACCENT_ONE",
  "COLOR_ACCENT_TWO",
] as const;
export const baseBackgrounds = [
  "inherit",
  "COLOR_PAGE",
  "COLOR_APP",
  "COLOR_SURFACE",
  "COLOR_ACCENT_ONE",
  "COLOR_ACCENT_TWO",
] as const;
export const baseBorders = ["inherit", "BORDER_STANDARD"] as const;
export const baseSpaces = [
  "inherit",
  "SPACE_XS",
  "SPACE_SM",
  "SPACE_MD",
  "SPACE_LG",
] as const;
export const baseSizes = ["unset"] as const;

export type BaseColor = string;
export type BaseBackground = string;
export type BaseBorder = string;
export type BaseSpace = string;

export type BaseStyleProps = {
  color?: BaseColor;
  background?: BaseBackground;
  border?: BaseBorder;
  padding?: BaseSpace;
  margin?: BaseSpace;
  width?: string;
  height?: string;
};

type BaseOwnProps<TElement extends ElementType> = BaseStyleProps & {
  as?: TElement;
  componentName?: string;
  showComponentName?: boolean;
};

export type BaseProps<TElement extends ElementType = "div"> =
  BaseOwnProps<TElement>
  & Omit<ComponentPropsWithRef<TElement>, keyof BaseOwnProps<TElement>>;

const BaseConfigurationContext = createContext({ showComponentName: false });

export type BaseConfigurationProviderProps = {
  children: ReactNode;
  showComponentName: boolean;
};

export function BaseConfigurationProvider({
  children,
  showComponentName,
}: BaseConfigurationProviderProps) {
  const [inspection, setInspection] = useState<{
    names: string[];
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!showComponentName) {
      return;
    }

    function inspect(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest("[data-component-inspector]")) {
        return;
      }
      if (
        target.closest("a")
        || (
          window.location.pathname === "/lab"
          && target.closest("button")
        )
      ) {
        setInspection(null);
        return;
      }

      const componentRoot = target.closest("[data-component-name]");
      if (
        !componentRoot
        || !isComponentLabelClick(componentRoot, event.clientX, event.clientY)
      ) {
        setInspection(null);
        return;
      }

      const names = collectComponentNames(componentRoot);
      if (names.length === 0) {
        setInspection(null);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setInspection({
        names,
        x: Math.min(event.clientX, window.innerWidth - 180),
        y: Math.min(event.clientY, window.innerHeight - 60),
      });
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setInspection(null);
      }
    }

    document.addEventListener("click", inspect, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", inspect, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showComponentName]);

  function openComponent(name: string) {
    clientStateStore.set(selectedLabComponentSlice, name);
  }

  return (
    <BaseConfigurationContext.Provider value={{ showComponentName }}>
      {children}
      {showComponentName && inspection && (
        <nav
          className={styles.inspector}
          style={{ left: inspection.x, top: inspection.y }}
          data-component-inspector
          aria-label="Component inspector"
        >
          {inspection.names.map((name) => (
            <a
              key={name}
              className={styles.inspectorLink}
              href="/lab"
              onClick={() => openComponent(name)}
            >
              {name}
            </a>
          ))}
        </nav>
      )}
    </BaseConfigurationContext.Provider>
  );
}

export function collectComponentNames(target: Element): string[] {
  const names: string[] = [];
  let current: Element | null = target.closest("[data-component-name]");

  while (current) {
    const name = current.getAttribute("data-component-name");
    if (name && !names.includes(name)) {
      names.push(name);
    }
    current = current.parentElement?.closest("[data-component-name]") ?? null;
  }

  return names;
}

function isComponentLabelClick(
  componentRoot: Element,
  clientX: number,
  clientY: number,
): boolean {
  const bounds = componentRoot.getBoundingClientRect();
  return clientX >= bounds.left
    && clientX <= Math.min(bounds.right, bounds.left + 150)
    && clientY >= bounds.top
    && clientY <= Math.min(bounds.bottom, bounds.top + 18);
}

export function Base<TElement extends ElementType = "div">({
  as,
  componentName,
  showComponentName,
  color,
  background,
  border,
  padding,
  margin,
  width = "unset",
  height = "unset",
  className,
  style,
  ...props
}: BaseProps<TElement>) {
  const configuration = useContext(BaseConfigurationContext);
  const Element = as ?? "div";
  const classes = className ? `${styles.root} ${className}` : styles.root;
  const baseStyle: CSSProperties = {
    ...style,
    color: resolveCssValue(color),
    background: resolveCssValue(background),
    border: resolveCssValue(border),
    padding: resolveCssValue(padding),
    margin: resolveCssValue(margin),
    width: resolveOptionalDimension(width),
    height: resolveOptionalDimension(height),
  };
  const displaysComponentName =
    (showComponentName ?? configuration.showComponentName)
    && Boolean(componentName);

  return (
    <Element
      {...props}
      className={classes}
      style={baseStyle}
      data-component-name={componentName}
      data-show-component-name={displaysComponentName || undefined}
    />
  );
}

export function resolveCssValue(value: string | undefined): string | undefined {
  return value?.replace(
    /\b[A-Z][A-Z0-9_]*\b/g,
    (token) => `var(--${token.toLowerCase().replaceAll("_", "-")})`,
  );
}

function resolveOptionalDimension(
  value: string | undefined,
): string | undefined {
  return value === "unset" ? undefined : resolveCssValue(value);
}
