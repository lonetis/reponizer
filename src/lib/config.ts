import { Application, getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";
import type { Protocol } from "./types";

interface Preferences {
  reposRoot?: string;
  defaultProtocol?: Protocol;
  scanDepth?: string;
  editorApp?: Application;
  terminalApp?: Application;
}

export interface Config {
  root: string;
  maxDepth: number;
  defaultProtocol: Protocol;
  editorApp?: Application;
  terminalApp?: Application;
}

export function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function getConfig(): Config {
  const prefs = getPreferenceValues<Preferences>();
  const root = path.resolve(expandTilde(prefs.reposRoot?.trim() || "~/repos"));
  const maxDepth = Number.parseInt(prefs.scanDepth ?? "4", 10) || 4;
  return {
    root,
    maxDepth,
    defaultProtocol: prefs.defaultProtocol === "https" ? "https" : "ssh",
    editorApp: prefs.editorApp,
    terminalApp: prefs.terminalApp,
  };
}
