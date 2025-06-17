import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export const deleteReport = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    throw new Error("Gagal menghapus laporan: " + error.message);
  }
};

export const moveReportToReturned = async (report) => {
  try {
    const returnedDocRef = doc(db, "returned_items", report.id);
    await setDoc(returnedDocRef, {
      ...report,
      returnedAt: new Date(),
    });
    await deleteDoc(doc(db, "lost_items", report.id));
  } catch (error) {
    throw new Error("Gagal memindahkan laporan: " + error.message);
  }
};