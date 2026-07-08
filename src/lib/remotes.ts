import gitUrlParse from "git-url-parse";
import type { Protocol, RemoteCheck, RemoteInfo } from "./types";

export interface ParsedRemote {
  /** Hostname without port, e.g. "github.com". */
  host: string;
  port?: number;
  /** Repo path without leading slash or ".git", e.g. "owner/repo" (may contain subgroups). */
  path: string;
  /** "ssh", "https", "http", "git", "file", … */
  protocol: string;
}

/**
 * Parse any git remote URL (scp-like, ssh://, https://, git://). Returns undefined when unparseable.
 * Leading-dash inputs are rejected so values that pass this check can never be read as git flags.
 */
export function parseRemoteUrl(url: string): ParsedRemote | undefined {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("-")) return undefined;
  try {
    const parsed = gitUrlParse(trimmed);
    if (!parsed.resource || !parsed.full_name) return undefined;
    return {
      host: parsed.resource,
      port: typeof parsed.port === "number" && parsed.port > 0 ? parsed.port : undefined,
      path: parsed.full_name.replace(/^\/+|\/+$/g, ""),
      protocol: parsed.protocol,
    };
  } catch {
    return undefined;
  }
}

/**
 * Protocol-independent identity of a remote: lowercased host + path without ".git".
 * Two remotes with equal normalized forms point to the same repository.
 */
export function normalizeRemoteUrl(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `${parsed.host.toLowerCase()}/${parsed.path.toLowerCase()}`;
}

export function remotesMatch(a: string, b: string): boolean {
  const na = normalizeRemoteUrl(a);
  const nb = normalizeRemoteUrl(b);
  return na !== undefined && na === nb;
}

export function buildRemoteUrl(host: string, repoPath: string, protocol: Protocol): string {
  if (protocol === "ssh") return `git@${host}:${repoPath}.git`;
  return `https://${host}/${repoPath}.git`;
}

export function protocolOf(url: string): string | undefined {
  return parseRemoteUrl(url)?.protocol;
}

/** Rewrite a remote URL to the given protocol. Non-standard ports are dropped. */
export function convertProtocol(url: string, to: Protocol): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return buildRemoteUrl(parsed.host, parsed.path, to);
}

/** Browser URL of the repository (best effort, works for GitHub/GitLab/Bitbucket-style hosts). */
export function webUrlFor(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `https://${parsed.host}/${parsed.path}`;
}

/** Relative install path (host/owner/repo) a remote URL maps to inside the repos root. */
export function relativePathForUrl(url: string): string | undefined {
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  return `${parsed.host.toLowerCase()}/${parsed.path}`;
}

/**
 * Expected origin URL derived from a repo's location under the root.
 * Returns undefined when the path does not follow the host/owner/repo layout.
 */
export function expectedOriginFor(relativePath: string, protocol: Protocol): string | undefined {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length < 2) return undefined;
  const host = segments[0];
  if (!host.includes(".")) return undefined;
  return buildRemoteUrl(host, segments.slice(1).join("/"), protocol);
}

export function checkRemotes(relativePath: string, remotes: RemoteInfo[], protocol: Protocol): RemoteCheck {
  const expectedUrl = expectedOriginFor(relativePath, protocol);
  const origin = remotes.find((r) => r.name === "origin");

  if (!expectedUrl) {
    return {
      state: "unstructured",
      actualUrl: origin?.fetchUrl,
      message: "Path does not follow the host/owner/repo layout, so the expected origin cannot be derived.",
    };
  }
  if (remotes.length === 0) {
    return { state: "no-remotes", expectedUrl, message: "No remotes configured." };
  }
  if (!origin) {
    const names = remotes.map((r) => r.name).join(", ");
    return { state: "no-origin", expectedUrl, message: `No “origin” remote (has: ${names}).` };
  }
  if (!remotesMatch(origin.fetchUrl, expectedUrl)) {
    return {
      state: "mismatch",
      expectedUrl,
      actualUrl: origin.fetchUrl,
      message: `origin points to ${origin.fetchUrl}, but the location implies ${expectedUrl}.`,
    };
  }
  return { state: "ok", expectedUrl, actualUrl: origin.fetchUrl, message: "origin matches the repo location." };
}

/**
 * Turn user input into a cloneable URL. Full URLs keep their protocol;
 * bare paths like "github.com/owner/repo" get the default protocol.
 */
export function coerceCloneUrl(input: string, defaultProtocol: Protocol): string | undefined {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  const hasScheme = /^(https?|ssh|git|file):\/\//.test(trimmed) || /^[\w.-]+@[\w.-]+:/.test(trimmed);
  if (hasScheme) {
    return parseRemoteUrl(trimmed) ? trimmed : undefined;
  }
  const bare = /^([\w.-]+\.[a-z]{2,})\/(.+)$/i.exec(trimmed);
  if (!bare) return undefined;
  return buildRemoteUrl(bare[1], bare[2].replace(/\.git$/, ""), defaultProtocol);
}
