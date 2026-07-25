# Reponizer Changelog

## [Host Aliases] - 2026-07-22

- New **Host Aliases** preference: map folder names under the root to real remote hosts (`buw=git.uni-wuppertal.de`), so short or legacy folder names pass the remote audit; clone destinations, bare-path clone inputs, relocation targets, and duplicate detection all honor the mapping
- New **Host-Only Comparison** preference: hosts whose repos are audited by host identity only, for services with opaque repo paths such as Overleaf project IDs

## [Initial Version] - 2026-07-08

- Search Repositories: hierarchical overview (host / owner sections), search, filters, detail panel
- Repo status: branch, ahead/behind, uncommitted changes, stashes, size on disk
- Remote auditing: origin must match the repo's location; auto-fix, relocate, manage remotes, protocol switching
- Clone repositories straight into the host/owner/repo structure
- Fetch All / Pull All (fast-forward only) with progress and summary
- Offload local copies of in-sync repos to free disk space, and re-download them later
- Export / import the repository list to mirror the folder across machines
- Optional menu bar command showing repositories that need attention
