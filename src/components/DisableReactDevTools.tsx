"use client";

import { useEffect } from "react";

export default function DisableReactDevTools() {
  useEffect(() => {
    // Only disable in production
    if (process.env.NODE_ENV === "production") {
      // Check if React DevTools is present
      if (
        typeof window !== "undefined" &&
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__
      ) {
        try {
          // Disable React DevTools
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled = true;

          // Only try to delete if the property is configurable
          const descriptor = Object.getOwnPropertyDescriptor(
            window,
            "__REACT_DEVTOOLS_GLOBAL_HOOK__"
          );

          if (descriptor && descriptor.configurable) {
            delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          } else {
            // If we can't delete it, neutralize its key methods instead
            const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
            if (hook && typeof hook === "object") {
              // Safely neutralize the hook's functionality
              hook.onCommitFiberRoot = null;
              hook.onCommitFiberUnmount = null;
              hook.inject = () => {};
            }
          }
        } catch (error) {
          // Silently handle any errors - don't spam the console
          // The isDisabled flag above should be sufficient
        }

        // Also disable Redux DevTools if present
        try {
          if (window.__REDUX_DEVTOOLS_EXTENSION__) {
            window.__REDUX_DEVTOOLS_EXTENSION__ = undefined;
          }
        } catch (error) {
          // Silently handle Redux DevTools errors too
        }
      }
    }
  }, []);

  return null;
}
