import { useEffect, useMemo, useRef, useState } from "react";
import type { BlueskyConnectionDto, TreeNodeDto } from "@flydeck/shared/v2";

import { v2Api } from "../../api/V2ApiClient";
import { useClientStateScope } from "../../state";
import {
  useWorkspaceReplica,
  workspaceSyncEngine,
  type WorkspaceReplicaScope,
} from "../../replica";
import { AppView, type AppViewProps } from "../AppView";
import type { TextareaProps } from "../Textarea";
import { Button, type ButtonProps } from "../Button";
import { InputControl, type InputControlProps } from "../InputControl";
import {
  TreeBrowser,
  TreeBrowserModel,
  type TreeBrowserInitialNode,
  type TreeBrowserProps,
} from "../TreeBrowser";
import styles from "./BlueskyApp.module.css";

const blueskyPostLength = 300;
const emptyNodes: readonly TreeNodeDto[] = [];

type BlueskyNodeData = { sourceNodeId: string };

export type BlueskyAppProps = Omit<
  AppViewProps,
  "accessMode" | "children" | "componentName" | "title"
> & {
  textareaProps?: TextareaProps;
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  connectionInputProps?: Omit<InputControlProps, "control" | "onChange" | "value">;
  treeBrowserProps?: Omit<
    TreeBrowserProps<BlueskyNodeData>,
    | "canCheckNode"
    | "canCreateNode"
    | "canDeleteNode"
    | "canMoveNode"
    | "canRenameNode"
    | "componentName"
    | "initialPageSizes"
    | "model"
    | "renderContent"
    | "renderRootContent"
    | "rootLabel"
    | "rootListEditable"
  >;
  workspaceId?: string;
};

export function BlueskyApp({
  textareaProps,
  buttonProps,
  connectionInputProps,
  treeBrowserProps,
  workspaceId,
  ...appViewProps
}: BlueskyAppProps) {
  const { userId } = useClientStateScope();
  const [dataSource, setDataSource] = useState("");
  const [handle, setHandle] = useState("");
  const [connection, setConnection] = useState<BlueskyConnectionDto>(() => {
    if (!workspaceId) return { provider: "bluesky", connected: false };
    const cached = localStorage.getItem(`flydeck.bluesky.connection.${workspaceId}`);
    if (!cached) return { provider: "bluesky", connected: false };
    try { return JSON.parse(cached) as BlueskyConnectionDto; }
    catch { return { provider: "bluesky", connected: false }; }
  });
  const [connectionError, setConnectionError] = useState("");
  const [connectionBusy, setConnectionBusy] = useState(false);
  const scope = useMemo<WorkspaceReplicaScope | null>(() => (
    workspaceId ? { userId, workspaceId } : null
  ), [userId, workspaceId]);
  const record = useWorkspaceReplica(scope);
  const nodes = record?.tree?.document.nodes ?? emptyNodes;
  const root = useMemo(
    () => resolveBlueskyDataSource(nodes, dataSource),
    [dataSource, nodes],
  );
  const branch = useMemo(
    () => root ? collectBlueskyBranch(nodes, root.id) : [],
    [nodes, root],
  );
  const initialPageSizes = useMemo(() => {
    const canonical = record?.tree?.selection.pageSizes ?? {};
    if (!root) return canonical;
    return {
      ...canonical,
      ...(canonical[root.id] ? { __tree_root__: canonical[root.id] } : {}),
    };
  }, [record?.tree?.selection.pageSizes, root]);
  const model = useMemo(() => new TreeBrowserModel<BlueskyNodeData>({
    definitionAuthority: true,
    initialTree: root
      ? branch
          .filter(({ parentId }) => parentId === root.id)
          .sort(compareNodes)
          .map((child) => toBlueskyTree(child, branch))
      : [],
    storageKey: `flydeck.tree.bluesky.${workspaceId ?? "local"}.${root?.id ?? "empty"}`,
  }), [branch, root, workspaceId]);

  useEffect(() => {
    if (scope) workspaceSyncEngine.register(scope);
  }, [scope]);

  useEffect(() => {
    if (!workspaceId) return;
    void v2Api.blueskyConnection(workspaceId).then((next) => {
      setConnection(next);
      localStorage.setItem(`flydeck.bluesky.connection.${workspaceId}`, JSON.stringify(next));
    }).catch((error: unknown) => setConnectionError(error instanceof Error ? error.message : "Connection status unavailable"));
  }, [workspaceId]);

  useEffect(() => {
    if (scope && branch.length > 0) {
      void workspaceSyncEngine.ensureContents(scope, branch.map(({ id }) => id));
    }
  }, [branch, scope]);

  return (
    <AppView
      {...appViewProps}
      accessMode="read"
      componentName="BlueskyApp"
      onDataSourceResolved={setDataSource}
      title="BLUESKY"
    >
      <div className={styles.connection}>
        {connection.connected ? (
          <>
            <div className={styles.connectionStatus}>Connected: {connection.handle ?? connection.did}</div>
            <Button {...buttonProps} disabled={connectionBusy} onClick={() => {
              if (!workspaceId) return;
              setConnectionBusy(true);
              void v2Api.disconnectBluesky(workspaceId).then(() => {
                const next = { provider: "bluesky", connected: false } as const;
                setConnection(next);
                localStorage.setItem(`flydeck.bluesky.connection.${workspaceId}`, JSON.stringify(next));
              }).catch((error: unknown) => setConnectionError(error instanceof Error ? error.message : "Disconnect failed"))
                .finally(() => setConnectionBusy(false));
            }}>Disconnect</Button>
          </>
        ) : (
          <InputControl
            {...connectionInputProps}
            control="input"
            keyboardSaveVisible={false}
            value={handle}
            onChange={setHandle}
            inputProps={{
              ...connectionInputProps?.inputProps,
              "aria-label": "Bluesky handle",
              label: "Bluesky handle",
            }}
            controlActions={(
              <Button
                {...buttonProps}
                disabled={!workspaceId || !handle.trim() || connectionBusy}
                onClick={() => {
                  if (!workspaceId) return;
                  setConnectionBusy(true); setConnectionError("");
                  void v2Api.connectBluesky(workspaceId, handle).then(({ authorizationUrl }) => {
                    window.location.assign(authorizationUrl);
                  }).catch((error: unknown) => {
                    setConnectionError(error instanceof Error ? error.message : "Connect failed");
                    setConnectionBusy(false);
                  });
                }}
              >Connect</Button>
            )}
          />
        )}
        {connectionError ? <div className={styles.connectionError}>{connectionError}</div> : null}
      </div>
      {root ? (
        <TreeBrowser
          {...treeBrowserProps}
          componentName="BlueskyTreeBrowser"
          initialPageSizes={initialPageSizes}
          menuVisible={false}
          model={model}
          rootLabel={root.label}
          rootListEditable={false}
          canCheckNode={() => false}
          canCreateNode={() => false}
          canDeleteNode={() => false}
          canMoveNode={() => false}
          canRenameNode={() => false}
          renderRootContent={() => {
            const content = record?.contents[root.id];
            return (
              <BlueskyTransformer
                key={`${root.id}:${content?.revision ?? 0}`}
                source={content?.content ?? ""}
                sourceNodeId={root.id}
                textareaProps={textareaProps}
                buttonProps={buttonProps}
                workspaceId={workspaceId}
              />
            );
          }}
          renderContent={({ node }) => {
            const sourceNodeId = node.data?.sourceNodeId ?? node.id;
            const content = record?.contents[sourceNodeId];
            return (
              <BlueskyTransformer
                key={`${sourceNodeId}:${content?.revision ?? 0}`}
                source={content?.content ?? ""}
                sourceNodeId={sourceNodeId}
                textareaProps={textareaProps}
                buttonProps={buttonProps}
                workspaceId={workspaceId}
              />
            );
          }}
        />
      ) : (
        <div className={styles.empty}>Datasource branch not found.</div>
      )}
    </AppView>
  );
}

export function BlueskyTransformer({
  source,
  sourceNodeId,
  textareaProps,
  buttonProps,
  workspaceId,
}: {
  source: string;
  sourceNodeId: string;
  textareaProps?: TextareaProps;
  buttonProps?: Omit<ButtonProps, "children" | "onClick">;
  workspaceId?: string;
}) {
  const [posts, setPosts] = useState(() => splitBlueskyPosts(source));
  const [numberThread, setNumberThread] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [imageVisible, setImageVisible] = useState(true);
  const controls = useRef<Array<HTMLTextAreaElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    const target = controls.current[pendingFocus.current];
    pendingFocus.current = null;
    target?.focus();
    target?.setSelectionRange(target.value.length, target.value.length);
  }, [posts]);

  return (
    <div className={styles.posts} aria-label="Bluesky posts">
      <Button {...buttonProps} selected={numberThread} onClick={() => setNumberThread((value) => !value)}>
        Number thread
      </Button>
      {workspaceId && imageVisible ? (
        <div className={styles.imagePreviewFrame}>
          <img
            className={styles.imagePreview}
            src={v2Api.dataImageUrl(workspaceId, sourceNodeId)}
            alt="Bluesky post attachment"
            onError={() => setImageVisible(false)}
          />
        </div>
      ) : null}
      {posts.map((post, index) => (
        <InputControl
          control="textarea"
          controlRef={{
            get current() { return controls.current[index]; },
            set current(value) { controls.current[index] = value; },
          }}
          key={`${sourceNodeId}-${index}`}
          keyboardSaveVisible={false}
          textareaProps={{
            ...textareaProps,
            "aria-label": `Bluesky post ${index + 1}`,
            label: `${index + 1}/${posts.length} · ${graphemeLength(post)}/${blueskyPostLength}`,
          }}
          value={post}
          onChange={(nextValue) => {
            if (nextValue.length > blueskyPostLength) {
              pendingFocus.current = index + 1;
            }
            setPosts((current) => updateBlueskyPosts(
              current,
              index,
              nextValue,
            ));
          }}
        />
      ))}
      <Button
        {...buttonProps}
        disabled={!workspaceId || submitting || posts.every((post) => !post.trim())}
        onClick={() => {
          if (!workspaceId) return;
          const output = numberThread
            ? createNumberedBlueskyThread(posts)
            : posts.map((post) => post.trim()).filter(Boolean);
          setSubmitting(true); setSubmitStatus("");
          void v2Api.publishBlueskyThread(workspaceId, output, sourceNodeId).then(({ posts: published }) => {
            setSubmitStatus(`${published.length} post${published.length === 1 ? "" : "s"} submitted.`);
          }).catch((error: unknown) => {
            setSubmitStatus(error instanceof Error ? error.message : "Submit failed");
          }).finally(() => setSubmitting(false));
        }}
      >Submit to Bluesky</Button>
      {submitStatus ? <output className={styles.submitStatus}>{submitStatus}</output> : null}
    </div>
  );
}

export function splitBlueskyPosts(source: string, limit = blueskyPostLength): string[] {
  const remaining = source.trim();
  if (!remaining) return [""];
  const posts: string[] = [];
  let rest = remaining;
  while (graphemeLength(rest) > limit) {
    const segments = graphemes(rest);
    const candidate = segments.slice(0, limit + 1);
    let cut = -1;
    for (let index = candidate.length - 1; index > 0; index -= 1) {
      if (/\s/u.test(candidate[index])) { cut = index; break; }
    }
    if (cut < 1) cut = limit;
    posts.push(candidate.slice(0, cut).join("").trimEnd());
    rest = segments.slice(cut).join("").trimStart();
  }
  posts.push(rest);
  return posts;
}

export function updateBlueskyPosts(
  posts: readonly string[],
  index: number,
  value: string,
): string[] {
  const next = [...posts];
  next[index] = value;
  for (let cursor = index; cursor < next.length; cursor += 1) {
    const segments = graphemes(next[cursor]);
    if (segments.length <= blueskyPostLength) continue;
    const overflow = segments.slice(blueskyPostLength).join("");
    next[cursor] = segments.slice(0, blueskyPostLength).join("");
    next[cursor + 1] = overflow + (next[cursor + 1] ?? "");
  }
  const nonEmpty = next.filter((post) => post !== "");
  return nonEmpty.length > 0 ? nonEmpty : [""];
}

export function createNumberedBlueskyThread(posts: readonly string[]): string[] {
  const source = posts.map((post) => post.trim()).filter(Boolean).join("\n");
  if (!source) return [];
  let total = 1;
  for (;;) {
    const reserved = graphemeLength(` (${total}/${total})`);
    const chunks = splitBlueskyPosts(source, blueskyPostLength - reserved);
    if (chunks.length === total) {
      return chunks.map((post, index) => `${post} (${index + 1}/${total})`);
    }
    total = chunks.length;
  }
}

export function graphemeLength(value: string) {
  return graphemes(value).length;
}

function graphemes(value: string) {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)]
    .map(({ segment }) => segment);
}

export function resolveBlueskyDataSource(
  nodes: readonly TreeNodeDto[],
  dataSource: string,
) {
  const segments = dataSource.trim().split("/").filter(Boolean);
  let parentId: string | null = null;
  let current: TreeNodeDto | undefined;
  for (const segment of segments) {
    current = nodes.find((node) => node.parentId === parentId
      && node.localId.toLowerCase() === segment.toLowerCase());
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

function collectBlueskyBranch(nodes: readonly TreeNodeDto[], rootId: string) {
  const result: TreeNodeDto[] = [];
  const visit = (id: string) => {
    const node = nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    result.push(node);
    nodes.filter((candidate) => candidate.parentId === id)
      .sort(compareNodes)
      .forEach((child) => visit(child.id));
  };
  visit(rootId);
  return result;
}

function toBlueskyTree(
  root: TreeNodeDto,
  branch: readonly TreeNodeDto[],
): TreeBrowserInitialNode<BlueskyNodeData> {
  const children = branch.filter(({ parentId }) => parentId === root.id)
    .sort(compareNodes);
  return {
    id: root.id,
    label: root.label,
    localId: root.localId,
    enabled: false,
    contentEditable: true,
    contentVisible: true,
    listEditable: false,
    data: { sourceNodeId: root.id },
    children: children.map((child) => toBlueskyTree(child, branch)),
  };
}

function compareNodes(left: TreeNodeDto, right: TreeNodeDto) {
  return left.position - right.position || left.id.localeCompare(right.id);
}
