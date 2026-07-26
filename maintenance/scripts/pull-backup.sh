#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(basename -- "$script_dir")" == "scripts" ]]; then
  backup_root="$(cd -- "$script_dir/.." && pwd)/backup"
else
  backup_root="$script_dir/backup"
fi

default_source="${FLYDON_BACKUP_SOURCE:-flydon@192.168.178.38:/home/flydon/.flydon-backup/}"
default_target="${FLYDON_BACKUP_TARGET:-$backup_root/}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") [--dry-run] [SOURCE] [TARGET]

Pulls a backup with rsync over SSH.

Defaults:
  SOURCE  $default_source
  TARGET  $default_target

Examples:
  $(basename "$0")
  $(basename "$0") --dry-run
  $(basename "$0") user@host:/remote/backup/ /local/backup/

The trailing slash on SOURCE copies its contents into TARGET.
Environment overrides: FLYDON_BACKUP_SOURCE, FLYDON_BACKUP_TARGET
EOF
}

dry_run=false
positionals=()

while (($# > 0)); do
  case "$1" in
    --dry-run)
      dry_run=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    --)
      shift
      positionals+=("$@")
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      positionals+=("$1")
      ;;
  esac
  shift
done

if ((${#positionals[@]} > 2)); then
  echo "Expected at most SOURCE and TARGET." >&2
  usage >&2
  exit 2
fi

source_path="${positionals[0]:-$default_source}"
target_path="${positionals[1]:-$default_target}"

if [[ "$target_path" == *:* ]]; then
  echo "TARGET must be a local path: $target_path" >&2
  exit 2
fi

mkdir -p -- "$target_path"

rsync_options=(
  --archive
  --compress
  --human-readable
  --info=progress2
  --partial
  --protect-args
  -e "ssh -o BatchMode=yes -o ConnectTimeout=8"
)

if [[ "$dry_run" == true ]]; then
  rsync_options+=(--dry-run)
  echo "Dry run: no files will be changed."
fi

echo "Source: $source_path"
echo "Target: $target_path"

rsync "${rsync_options[@]}" -- "$source_path" "$target_path"

echo "Backup pull completed."
