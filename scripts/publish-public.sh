#!/usr/bin/env bash
set -Eeuo pipefail

source_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
public_root="${FLYDECK_PUBLIC_DIR:-/home/sntr/code/flydeck-releases}"

if [[ ! -d "$public_root/.git" ]]; then
  echo "Public checkout not found: $public_root" >&2
  echo "Clone the public repository there or set FLYDECK_PUBLIC_DIR." >&2
  exit 1
fi

public_root="$(git -C "$public_root" rev-parse --show-toplevel)"
if [[ "$public_root" == "$source_root" || "$public_root" == "/" ]]; then
  echo "Refusing unsafe public checkout: $public_root" >&2
  exit 1
fi

unexpected_public_changes=()
while IFS= read -r -d '' changed_path; do
  case "$changed_path" in
    README.md|releases/*) ;;
    *) unexpected_public_changes+=("$changed_path") ;;
  esac
done < <(
  {
    git -C "$public_root" diff --name-only -z
    git -C "$public_root" diff --cached --name-only -z
    git -C "$public_root" ls-files --others --exclude-standard -z
  }
)

if (( ${#unexpected_public_changes[@]} > 0 )); then
  echo "Public checkout has changes outside README.md and releases/; refusing to overwrite them:" >&2
  printf '  %s\n' "${unexpected_public_changes[@]}" >&2
  exit 1
fi

public_branch="$(git -C "$public_root" branch --show-current)"
if [[ -z "$public_branch" ]]; then
  echo "Public checkout is in detached HEAD state." >&2
  exit 1
fi

source_revision="$(git -C "$source_root" rev-parse --short=12 HEAD)"
file_list="$(mktemp)"
trap 'rm -f -- "$file_list"' EXIT

# Include tracked files and non-ignored additions from the current working tree.
git -C "$source_root" ls-files -co --exclude-standard -z >"$file_list"

echo "Publishing Flydeck $source_revision to $public_root ($public_branch)..."

# Removing the public repository's tracked files first also propagates deletions.
# Public release documentation and screenshots are maintained independently.
git -C "$public_root" rm -r --ignore-unmatch --quiet -- \
  . ":(exclude)README.md" ":(exclude)releases/**"
rsync -a \
  --exclude="/README.md" \
  --exclude="/releases/" \
  --from0 \
  --files-from="$file_list" \
  "$source_root/" "$public_root/"

git -C "$public_root" add --all

if git -C "$public_root" diff --cached --quiet; then
  echo "Public checkout already matches the selected development state."
else
  git -C "$public_root" commit -m "Publish Flydeck $source_revision"
fi

git -C "$public_root" push
echo "Published $source_revision to the public repository."
