import { useSyncExternalStore } from "react";
import { getDriveState, subscribeDrive } from "@/lib/drive-sync";
import { subscribeRemoteChanges } from "@/lib/receipt";

export function useDriveState() {
  return useSyncExternalStore(subscribeDrive, getDriveState);
}

let revision = 0;
subscribeRemoteChanges(() => {
  revision++;
});

export function useReceiptsRevision() {
  return useSyncExternalStore(subscribeRemoteChanges, () => revision);
}
