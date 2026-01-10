import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";
import { clientsAPI } from "@/api/clients.api";
import type { Client, ClientContextType } from "@/Types/types";

const ClientContext = createContext<ClientContextType | null>(null);

export const useClientContext = () => {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useClientContext must be used within ClientProvider");
  }
  return ctx;
};

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  const { idToken } = useAuthContext();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!idToken) return;

    try {
      setLoading(true);
      const data = await clientsAPI.getAll(idToken);
      setClients(data);
    } catch (err: any) {
      const msg = err.message || "Failed to fetch clients";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return (
    <ClientContext.Provider value={{ clients, loading, error, fetchClients }}>
      {children}
    </ClientContext.Provider>
  );
};
