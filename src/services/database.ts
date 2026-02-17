import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { firestore } from "@/services/firebase";
import { DiscoverFeed, FoodLog, WeightEntry } from "@/types/models";

const logsCollection = "foodLogs";
const usersCollection = "users";

interface UserWeightPayload {
  weightEntries?: WeightEntry[];
  discoverFeedCache?: Record<string, DiscoverFeed>;
}

const sortWeightsDesc = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

const pruneDiscoverCache = (
  cache: Record<string, DiscoverFeed>,
  keep = 14
): Record<string, DiscoverFeed> => {
  const sortedKeys = Object.keys(cache).sort((a, b) => (a < b ? 1 : -1));
  const kept = sortedKeys.slice(0, keep);
  return kept.reduce<Record<string, DiscoverFeed>>((acc, key) => {
    acc[key] = cache[key];
    return acc;
  }, {});
};

export const databaseService = {
  async listFoodLogs(userId: string): Promise<FoodLog[]> {
    const logsQuery = query(collection(firestore, logsCollection), where("userId", "==", userId));
    const snapshot = await getDocs(logsQuery);
    return snapshot.docs
      .map((entry) => entry.data() as FoodLog)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  },

  async upsertFoodLog(log: FoodLog): Promise<void> {
    await setDoc(doc(firestore, logsCollection, log.id), log, { merge: true });
  },

  async deleteFoodLog(_userId: string, logId: string): Promise<void> {
    await deleteDoc(doc(firestore, logsCollection, logId));
  },

  async listWeightEntries(userId: string): Promise<WeightEntry[]> {
    const snapshot = await getDoc(doc(firestore, usersCollection, userId));
    if (!snapshot.exists()) {
      return [];
    }
    const payload = snapshot.data() as UserWeightPayload;
    return sortWeightsDesc(payload.weightEntries || []);
  },

  async upsertWeightEntry(entry: WeightEntry): Promise<void> {
    const userRef = doc(firestore, usersCollection, entry.userId);
    const snapshot = await getDoc(userRef);
    const payload = snapshot.exists() ? (snapshot.data() as UserWeightPayload) : {};
    const current = payload.weightEntries || [];
    const next = current.some((item) => item.id === entry.id)
      ? current.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...current];

    await setDoc(userRef, { weightEntries: sortWeightsDesc(next) }, { merge: true });
  },

  async deleteWeightEntry(userId: string, entryId: string): Promise<void> {
    const userRef = doc(firestore, usersCollection, userId);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      return;
    }
    const payload = snapshot.data() as UserWeightPayload;
    const current = payload.weightEntries || [];
    const next = current.filter((item) => item.id !== entryId);
    await setDoc(userRef, { weightEntries: sortWeightsDesc(next) }, { merge: true });
  },

  async getDiscoverFeed(userId: string, dateKey: string): Promise<DiscoverFeed | null> {
    const snapshot = await getDoc(doc(firestore, usersCollection, userId));
    if (!snapshot.exists()) {
      return null;
    }
    const payload = snapshot.data() as UserWeightPayload;
    return payload.discoverFeedCache?.[dateKey] || null;
  },

  async upsertDiscoverFeed(userId: string, feed: DiscoverFeed): Promise<void> {
    const userRef = doc(firestore, usersCollection, userId);
    const snapshot = await getDoc(userRef);
    const payload = snapshot.exists() ? (snapshot.data() as UserWeightPayload) : {};
    const current = payload.discoverFeedCache || {};
    const next = pruneDiscoverCache({
      ...current,
      [feed.dateKey]: feed
    });
    await setDoc(userRef, { discoverFeedCache: next }, { merge: true });
  }
};
