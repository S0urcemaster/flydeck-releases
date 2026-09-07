# Relay One publication boundary

Relay One is an independent public projection. Flydon pushes immutable,
versioned publication snapshots to Netcup; Netcup never reads Flydon's database
or filesystem and never needs an inbound connection to Flydon.

## Publication lifecycle

1. Flydon stages a complete manifest.
2. Relay One reports which content-addressed assets are missing.
3. Flydon uploads those assets and verifies their SHA-256 digest.
4. Flydon requests activation.
5. Relay One activates the version in one database transaction only when every
   referenced asset is present.
6. The previous version remains public until activation succeeds.

Public readers select only `relay_publications.active_version`. Staging data is
never exposed by public endpoints. Unpublishing removes the publication from
the public projection; unreferenced assets are garbage-collected separately
after a retention period.

Public browser URLs use the current root-to-node `localId` chain. Relay One
stores no former paths, aliases, or redirects. Moving a node or changing its
`localId` makes the former URL return 404; only the current active publication
tree determines which readable paths exist. Internal navigation updates these
paths through the browser History API without reloading the document; direct
requests, reloads, new tabs, and browser back/forward remain server-resolvable.

## Trust boundary

The public API and frontend use only Netcup PostgreSQL and the Netcup asset
directory. The ingest API is authenticated separately, accepts idempotent
requests, applies strict size limits, and stores uploads under their SHA-256
digest rather than a client-provided path.

During migration the legacy Flydon-backed reader remains available. It is
removed only after an initial full publication has been activated and the
Netcup deployment has passed an isolation test with Flydon unreachable.
