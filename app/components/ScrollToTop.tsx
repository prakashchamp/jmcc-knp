"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ScrollToTop() {
  const router = useRouter();

  useEffect(() => {
    // Scroll to top on initial mount
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    // Scroll to top on route changes
    const handleRouteChange = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    };

    router.prefetch; // Trigger route change listener
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [router]);

  return null;
}
