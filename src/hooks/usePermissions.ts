import { useState, useEffect } from "react";

export function usePermissions() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; role: string; permissions?: string[] } | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("sims_session");
    if (session) {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        console.error("Failed to parse session in usePermissions");
      }
    }
  }, []);

  const hasPermission = (action: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "SUPER_ADMIN") return true;
    return currentUser.permissions?.includes(action) || false;
  };

  const hasAnyPermission = (actions: string[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "SUPER_ADMIN") return true;
    return actions.some((act) => currentUser.permissions?.includes(act));
  };

  return {
    currentUser,
    hasPermission,
    hasAnyPermission,
    role: currentUser?.role || null,
  };
}
