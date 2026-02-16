import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { databaseService } from "@/services/database";
import { FoodLog, WeightEntry } from "@/types/models";
import { useAuth } from "@/state/AuthContext";

interface LogContextValue {
  logs: FoodLog[];
  loadingLogs: boolean;
  refreshLogs: () => Promise<void>;
  saveLog: (log: FoodLog) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;

  weightEntries: WeightEntry[];
  loadingWeightEntries: boolean;
  refreshWeightEntries: () => Promise<void>;
  saveWeightEntry: (entry: WeightEntry) => Promise<void>;
  deleteWeightEntry: (entryId: string) => Promise<void>;
}

const LogContext = createContext<LogContextValue | undefined>(undefined);

export const LogProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [loadingWeightEntries, setLoadingWeightEntries] = useState(false);

  const refreshLogs = async (): Promise<void> => {
    if (!user) {
      setLogs([]);
      return;
    }
    setLoadingLogs(true);
    try {
      const entries = await databaseService.listFoodLogs(user.id);
      setLogs(entries);
    } catch (error) {
      console.warn("refreshLogs failed", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const refreshWeightEntries = async (): Promise<void> => {
    if (!user) {
      setWeightEntries([]);
      return;
    }
    setLoadingWeightEntries(true);
    try {
      const entries = await databaseService.listWeightEntries(user.id);
      setWeightEntries(entries);
    } catch (error) {
      console.warn("refreshWeightEntries failed", error);
    } finally {
      setLoadingWeightEntries(false);
    }
  };

  useEffect(() => {
    void refreshLogs();
    void refreshWeightEntries();
  }, [user?.id]);

  const value = useMemo<LogContextValue>(
    () => ({
      logs,
      loadingLogs,
      refreshLogs,
      saveLog: async (log) => {
        await databaseService.upsertFoodLog(log);
        await refreshLogs();
      },
      deleteLog: async (logId) => {
        if (!user) return;
        await databaseService.deleteFoodLog(user.id, logId);
        await refreshLogs();
      },

      weightEntries,
      loadingWeightEntries,
      refreshWeightEntries,
      saveWeightEntry: async (entry) => {
        await databaseService.upsertWeightEntry(entry);
        await refreshWeightEntries();
      },
      deleteWeightEntry: async (entryId) => {
        if (!user) return;
        await databaseService.deleteWeightEntry(user.id, entryId);
        await refreshWeightEntries();
      }
    }),
    [loadingLogs, logs, loadingWeightEntries, user, weightEntries]
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};

export const useLogs = (): LogContextValue => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogs must be used within LogProvider");
  }
  return context;
};
