# Relay Node invariants

Relay One, Relay Two, and later installations are equal instances of the same
Relay Node software. Names describe deployments, never software roles.

Every node may independently enable these boundaries:

- home ingress accepts versioned publications from zero or more private homes;
- federation exchanges signed public publications with peer nodes;
- accounts own isolated local workspaces and may publish through the same
  publication pipeline;
- diagnostics sends explicitly consented operational reports.

A node can be useful with any combination of sources. In particular, Relay Two
does not need a private home now, but must be able to attach one later without a
new image or data migration to a different product edition.

## Data ownership

- Private homes never become dependencies of remote peers.
- A node stores its database, assets, identity, accounts, and backups locally.
- Federated publications retain their origin identity and are read-only on the
  receiving node.
- Local account data never enters a private home unless an explicit future
  export is requested.
- Public readers only observe atomically activated publication versions.

## Relationships

Peer trust is symmetric: both nodes authenticate the other's stable identity.
Subscriptions are directional and explicit. Trust does not imply copying every
publication in either direction.

Capability flags describe behavior enabled on an installation. They must not
be enabled until the corresponding server boundary is implemented and active.
