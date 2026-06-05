import { useCallback, useEffect, useState } from "react";
import {
  type AppSettings,
  loadSettings,
  saveSettings as persist,
} from "../lib/settings";
import { fetchServerConfig, type ServerConfig } from "../lib/config";

export interface SettingsApi {
  /** Effective settings: server (.env) values take precedence over localStorage. */
  settings: AppSettings;
  /** Which fields are fixed by the server's .env (and thus not user-editable). */
  serverManaged: Record<keyof ServerConfig, boolean>;
  /** True once the server config has been fetched. */
  ready: boolean;
  /** Persist user overrides (ignored for server-managed fields). */
  update: (patch: Partial<AppSettings>) => void;
}

/**
 * Settings come from two sources:
 *  - the web server's `.env` (via `/api/config`) — authoritative when present
 *  - the browser's localStorage — user fallback for anything not set on the server
 */
export function useSettings(): SettingsApi {
  const [stored, setStored] = useState<AppSettings>(() => loadSettings());
  const [server, setServer] = useState<Partial<ServerConfig>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchServerConfig().then((cfg) => {
      if (!active) return;
      setServer(cfg);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setStored((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const settings: AppSettings = {
    apiBaseUrl: server.apiBaseUrl || stored.apiBaseUrl,
    googleClientId: server.googleClientId || stored.googleClientId,
  };

  const serverManaged = {
    apiBaseUrl: Boolean(server.apiBaseUrl),
    googleClientId: Boolean(server.googleClientId),
  };

  return { settings, serverManaged, ready, update };
}
