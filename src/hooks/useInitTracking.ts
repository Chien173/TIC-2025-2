/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import ReactTracker from "react-tracker-teko";
import { useAuth } from "../contexts/AuthContext";

export const useInitTracking = () => {
  const { user } = useAuth();
  // get user info from supabase

  useEffect(() => {
    try {
      // Initialize ReactTracker with the provided configuration
      new ReactTracker({
        appId: "568212b6-6d46-4e66-a277-6df247a83f29",
        host: "https://tracking.tekoapis.com",
        urlServeJsFile:
          "https://cdn.tekoapis.com/tracker/dist/v2/tracker.full.min.js",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).track("test", {
        test: "test",
      });
    } catch (error) {
      console.error("Failed to initialize ReactTracker:", error);
    }
  }, []);

  useEffect(() => {
    if (!(window as any).track) {
      return;
    }

    if (user && user.id) {
      (window as any).track("setUserId", user.id);
    }
  }, [user]);
};
