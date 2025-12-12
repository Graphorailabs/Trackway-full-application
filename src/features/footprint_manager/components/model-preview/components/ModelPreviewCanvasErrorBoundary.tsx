import React from "react";
import { ModelFailureDisplay } from "./ModelFailureDisplay";

type CanvasBoundaryState = { hasError: boolean; message?: string };

type ModelPreviewCanvasErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackMessage: string;
};

export class ModelPreviewCanvasErrorBoundary extends React.Component<
  ModelPreviewCanvasErrorBoundaryProps,
  CanvasBoundaryState
> {
  constructor(props: ModelPreviewCanvasErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): CanvasBoundaryState {
    return { hasError: true, message: error?.message ?? String(error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error("Model preview canvas failed", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ModelFailureDisplay message={this.props.fallbackMessage} />;
    }
    return this.props.children;
  }
}
