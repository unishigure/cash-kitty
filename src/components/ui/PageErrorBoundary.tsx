import { Component, type ReactNode } from "react";

import { Notice } from "@/components/ui/Notice";
import { errorMessage } from "@/lib/ui/status";

export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error?: unknown }
> {
  override state: { error?: unknown } = {};

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  override componentDidCatch(error: unknown) {
    console.error(error);
  }

  override render() {
    if (this.state.error === undefined) return this.props.children;
    return (
      <Notice
        status={{
          tone: "error",
          text: `画面を表示できませんでした。${errorMessage(this.state.error)}`,
        }}
      />
    );
  }
}
