"use client";

import { createContext, useContext } from "react";

// Usuario, organización y rol actuales (los resuelve el layout en el servidor)
const SessionContext = createContext(null);

export default function SessionProvider({ value, children }) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession fuera de SessionProvider");
  return session;
}

// El rol "accountant" (gestor) solo puede consultar
export const canWrite = (role) => role !== "accountant";
