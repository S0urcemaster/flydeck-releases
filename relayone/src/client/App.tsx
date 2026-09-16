import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { RelayPost, RelaySite } from "../shared/contracts";
import type {
  RelayNavigationLevel,
  RelayNodePage,
} from "../shared/contracts";
import { FullscreenImage } from "./FullscreenImage";
import { isSportExerciseContent } from "./SportPlayerData";

const SportPlayer = lazy(() => import("./SportPlayer").then((module) => ({ default: module.SportPlayer })));

export function App() {
  const initialLocation = readRelayLocation();
  const [peerId, setPeerId] = useState<string | null>(initialLocation.peerId);
  const [peers, setPeers] = useState<Array<{ id: string; nodeId: string; title: string }>>([]);
  const [site, setSite] = useState<RelaySite | null>(null);
  const [page, setPage] = useState<RelayNodePage | null>(null);
  const [error, setError] = useState<string>();
  const [selectedPath, setSelectedPath] = useState(initialLocation.path);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(peerId ? `/api/peers/${encodeURIComponent(peerId)}/site` : "/api/site", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Relay node returned ${response.status}.`);
        return response.json() as Promise<RelaySite>;
      })
      .then((value) => setSite(normalizeRelaySite(value)))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Relay node is unavailable.");
        }
      });
    return () => controller.abort();
  }, [peerId]);

  useEffect(() => {
    fetch("/api/peers").then((response) => response.ok ? response.json() : [])
      .then((value) => setPeers(value));
  }, []);

  const activePath = selectedPath.length > 0
    ? selectedPath
    : site?.roots[0] ? [site.roots[0].localId] : null;

  useEffect(() => {
    if (site?.title) document.title = site.title;
  }, [site?.title]);

  useEffect(() => {
    if (selectedPath.length === 0 && activePath) {
      window.history.replaceState(null, "", postHref(activePath, peerId));
      setSelectedPath(activePath);
    }
  }, [activePath?.join("/"), selectedPath.length]);

  useEffect(() => {
    if (!activePath) {
      setPage(null);
      return;
    }
    const controller = new AbortController();
    fetch(`${peerId ? `/api/peers/${encodeURIComponent(peerId)}` : "/api"}/path?value=${encodeURIComponent(activePath.join("/"))}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Relay node returned ${response.status}.`);
        return response.json() as Promise<RelayNodePage>;
      })
      .then((value) => {
        setPage(value);
        setError(undefined);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "The post is unavailable.");
        }
      });
    return () => controller.abort();
  }, [activePath?.join("/"), peerId]);

  useEffect(() => {
    const onPopState = () => {
      const location = readRelayLocation(); setPeerId(location.peerId); setSelectedPath(location.path);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onNavigate = (event: MouseEvent) => {
      if (event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
        || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[data-relay-navigation]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      window.history.pushState(null, "", destination.pathname);
      const location = readRelayLocation(destination.pathname);
      setPeerId(location.peerId); setSelectedPath(location.path);
    };
    document.addEventListener("click", onNavigate);
    return () => document.removeEventListener("click", onNavigate);
  }, []);

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    const activePost = navigation?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!navigation || !activePost) return;
    navigation.scrollTop += activePost.getBoundingClientRect().top
      - navigation.getBoundingClientRect().top;
  }, [page?.post.id]);

  if (error) {
    return (
      <main className="statusPage">
        <span className="mark" aria-hidden="true">𐦍</span>
        <h1>{site?.title ?? "Relay Node"}</h1>
        <p>{error}</p>
      </main>
    );
  }
  if (!site) {
    return <main className="statusPage" aria-busy="true">Loading Relay…</main>;
  }

  if (site.roots.length === 0) {
    return (
      <main className="statusPage">
        <span className="mark" aria-hidden="true">𐦍</span>
        <h1>{site.title}</h1>
        <p>No shared areas yet.</p>
      </main>
    );
  }

  if (!page) {
    return <main className="statusPage" aria-busy="true">Loading publication…</main>;
  }

  const { post, parents } = page;
  return (
    <div className="siteShell">
      <header className={`siteHeader${showcaseMode ? " siteHeaderShowcase" : ""}`}>
        <div className="brand">
          <button
          className="mark logoToggle"
          aria-label={showcaseMode ? "Show Relay One interface" : "Show background animation"}
          aria-pressed={showcaseMode}
          onClick={(event) => {
            event.preventDefault();
            setShowcaseMode((visible) => !visible);
          }}
          >
            <span className="logoHalf logoHalfLeft" aria-hidden="true">𐦍</span>
            <span className="logoHalf logoHalfRight" aria-hidden="true">𐦍</span>
          </button>
          {!showcaseMode && <a className="brandTitle" href="/" data-relay-navigation>{site.title}</a>}
        </div>
        {!showcaseMode && <nav className="appLinks" aria-label="Relay One apps">
          <h3 className="appLinksLabel">Digi Craft Apps:</h3>
          <a href="https://relay-two.relay-one.de/flydeck/" rel="noreferrer" target="_blank"><h3>Flydeck Trial</h3></a>
          <a href="https://apps.relay-one.de/webdictate" rel="noreferrer" target="_blank"><h3>Web Dictate</h3></a>
          <a href="https://apps.relay-one.de/textor" rel="noreferrer" target="_blank"><h3>Textor</h3></a>
        </nav>}
        {!showcaseMode && peers.length > 0 && <nav className="relayLinks" aria-label="Connected relays">
          {peers.map((peer) => <a data-relay-navigation href={`/@/${encodeURIComponent(peer.id)}/`} key={peer.id}>{peer.title}</a>)}
        </nav>}
        {!showcaseMode && <>
          <hr className="headerDivider" />
          <nav className="breadcrumbs" aria-label="Breadcrumb">
        {parents.map((parent, index) => (
          <span key={parent.id}>
            {parent !== parents[0] && <span aria-hidden="true">/</span>}
            <a
              data-relay-navigation
              href={postHref(parents.slice(0, index + 1).map(({ localId }) => localId), peerId)}
            >
              {parent.label}
            </a>
          </span>
        ))}
        <span>
          {parents.length > 0 && <span aria-hidden="true">/</span>}
          <span aria-current="page">{post.label}</span>
        </span>
          </nav>
        </>}
      </header>
      {!showcaseMode && <>
      <div className="publication">
        <aside className="postNavigation" aria-label="Published data">
          <nav ref={navigationRef}>
            <PostNavigation
              levels={page.levels}
              selectedId={post.id}
              peerId={peerId}
            />
          </nav>
        </aside>
        <main className="postView">
          <article data-tone={parents.length % 2 === 0 ? "green" : "blue"}>
            <header className="postHeader">
              <h1>{post.label}</h1>
              <ItemDateRange
                createdAt={post.createdAt}
                updatedAt={post.updatedAt}
              />
            </header>
            {post.imageUrl && (
              <FullscreenImage
                alt={post.label}
                buttonClassName="heroImageButton"
                imageClassName="heroImage"
                src={post.imageUrl}
              />
            )}
            <PostContent post={post} />
          </article>
          {post.children.length > 0 && (
            <section className="childPosts" aria-label="Child posts">
              <div className="postGrid">
                {post.children.map((child) => (
                  <a
                    className="postCard"
                    data-relay-navigation
                    href={postHref([...parents, post, child].map(({ localId }) => localId), peerId)}
                    key={child.id}
                  >
                    {child.imageUrl && (
                      <img src={child.imageUrl} alt="" loading="lazy" />
                    )}
                    <span className="postCardBody">
                      <ItemDateRange
                        createdAt={child.createdAt}
                        updatedAt={child.updatedAt}
                      />
                      <strong>{child.label}</strong>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <footer>{site.title} by Digi Craft</footer>
      </>}
    </div>
  );
}

export function normalizeRelaySite(site: RelaySite): RelaySite {
  return site;
}

export function PostNavigation({
  levels,
  selectedId,
  peerId,
}: {
  levels: RelayNavigationLevel[];
  selectedId: string;
  peerId?: string | null;
}) {
  return (
    <div className="treeLevels">
      {levels.map((level) => (
        <section
          className="treeLevel"
          data-tone={level.depth % 2 === 0 ? "green" : "blue"}
          aria-label={`Data level ${level.depth + 1}`}
          key={level.depth}
        >
          <ul>
            {level.nodes.map((node) => (
              <li key={node.id}>
                <a
                  aria-current={node.id === selectedId ? "page" : undefined}
                  data-path-selected={node.id === level.activeId || undefined}
                  data-relay-navigation
                  href={postHref([
                    ...levels.slice(0, level.depth).flatMap((ancestorLevel) => {
                      const active = ancestorLevel.nodes.find(
                        ({ id }) => id === ancestorLevel.activeId,
                      );
                      return active ? [active.localId] : [];
                    }),
                    node.localId,
                  ], peerId)}
                >
                  <span>{node.label}</span>
                  {node.hasChildren && (
                    <span
                      className="childIndicator"
                      aria-label={`${node.childCount} children`}
                    >
                      {node.childCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PostContent({ post }: { post: RelayPost }) {
  if (!post.content.trim()) return null;
  if (isSportExerciseContent(post.content)) {
    return <Suspense fallback={<div className="sportPlayerLoading" aria-busy="true">Loading exercise player…</div>}><SportPlayer content={post.content} /></Suspense>;
  }
  if (post.format === "json") {
    return <pre className="postContent jsonContent">{prettyJson(post.content)}</pre>;
  }
  return <div className="postContent">{renderSafeText(post.content)}</div>;
}

function renderSafeText(content: string) {
  const blocks = content.trim().split(/\n\s*\n/);
  return blocks.map((block, index) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    if (heading && !heading[2].includes("\n")) {
      const level = heading[1].length + 1;
      const Heading = `h${level}` as "h2" | "h3" | "h4";
      return <Heading key={index}>{heading[2]}</Heading>;
    }
    if (block.split("\n").every((line) => /^[-*]\s+/.test(line))) {
      return (
        <ul key={index}>
          {block.split("\n").map((line, lineIndex) => (
            <li key={lineIndex}>{line.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }
    return <p key={index}>{withLineBreaks(block)}</p>;
  });
}

function withLineBreaks(value: string): ReactNode[] {
  return value.split("\n").flatMap((line, index) => (
    index === 0 ? [line] : [<br key={`br-${index}`} />, line]
  ));
}

export function ItemDateRange({
  createdAt,
  updatedAt,
}: {
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <span className="dateRange">
      <time dateTime={createdAt}>{formatDate(createdAt)}</time>
      <span aria-hidden="true"> – </span>
      <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
    </span>
  );
}

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function readPath(pathname = window.location.pathname) {
  return readRelayLocation(pathname).path;
}

export function readRelayLocation(pathname = window.location.pathname) {
  try {
    const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
    return parts[0] === "@" && parts[1]
      ? { peerId: parts[1], path: parts.slice(2) }
      : { peerId: null, path: parts };
  } catch {
    return { peerId: null, path: [] };
  }
}

export function postHref(localIds: readonly string[], peerId?: string | null) {
  const prefix = peerId ? `/@/${encodeURIComponent(peerId)}` : "";
  return `${prefix}/${localIds.map(encodeURIComponent).join("/")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
