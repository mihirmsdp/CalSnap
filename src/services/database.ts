import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { firestore } from "@/services/firebase";
import { FoodLog, WeightEntry } from "@/types/models";

const logsCollection = "foodLogs";
const usersCollection = "users";

interface UserWeightPayload {
  weightEntries?: WeightEntry[];
}

const sortWeightsDesc = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

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
  }
};
