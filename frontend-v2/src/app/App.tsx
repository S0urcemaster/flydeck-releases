import { AppShell } from "../components/AppShell";
import { AppTitle } from "../components/AppTitle";
import { ButtonLink } from "../components/ButtonLink";

export function App() {
  return (
    <AppShell
      title={(
        <AppTitle
          title="Flydeck"
          subtitle="Workspace Console · V2"
          action={(
            import.meta.env.DEV
              ? <ButtonLink href="/lab" placement="app-edge">LAB</ButtonLink>
              : undefined
          )}
        />
      )}
    />
  );
}
