# Workspace replica contract

The workspace replica is Flydeck's local source of truth for DATA. It is not a
disposable response cache.

## Invariants

- A user command is persisted in IndexedDB and applied to `tree`/`contents` in
  one transaction before it is sent to the server.
- `confirmedTree` and `confirmedContents` are the latest server checkpoint.
- `tree` and `contents` are the visible projection of that checkpoint plus the
  complete ordered outbox.
- A successful mutation response advances the checkpoint, removes exactly its
  matching idempotent request, and reapplies every later outbox command in one
  local transaction.
- A full tree response never clears the outbox. Pending commands are rebased on
  top of it.
- A transport failure leaves the command pending. A permanent rejection leaves
  it present and marks it blocked. Neither failure replaces the local tree.
- Commands are sent in outbox order. Their request IDs are stable across retry,
  so the server can return an earlier idempotent result without duplicating the
  mutation.
- Image commands keep only their stable node/file reference in the ordered
  outbox. The original Blob remains in the dedicated IndexedDB image store
  until its upload succeeds, so a new node is created before its image is sent.

## Full server reads

A full server tree is read only to initialize an empty replica, reconnect, or
recover from a revision conflict. A normal successful outbox drain does not
refresh the complete tree.

## Recovery

On a revision conflict, the client reads a server checkpoint and any server
content needed by pending content commands. It then recalculates command
revisions and rebuilds the local projection. A repeatedly conflicting or
invalid command is retained as blocked for an explicit later retry or repair.
`WorkspaceSyncEngine.retryBlocked()` releases one such command deliberately;
`WorkspaceReplica.exportRecord()` produces a complete JSON repair snapshot
including the checkpoint, visible projection, contents, and outbox.

The APPS/System `Maintenance` action is the deliberate destructive escape
hatch. `Reset Client to Server` first loads a valid server tree, then atomically
replaces the replica, clears its contents and complete outbox, and deletes all
cached image drafts for that workspace. It never clears local state when the
server read fails.
