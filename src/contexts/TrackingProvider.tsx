import React from "react";
import { useInitTracking } from "../hooks/useInitTracking";

export interface TrackingProviderProps {
  children?: React.ReactNode;
}
export const TrackingProvider: React.FC<TrackingProviderProps> = ({
  children,
}) => {
  useInitTracking();

  return <React.Fragment>{children}</React.Fragment>;
};

export default TrackingProvider;
