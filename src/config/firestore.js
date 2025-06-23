import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// LOST ITEMS
export const saveLostItemReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, "lost_items"), {
      ...reportData,
      createdAt: serverTimestamp(),
    });
    console.log("Saved lost item report:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving lost item:", error.code, error.message);
    throw new Error("Gagal menyimpan laporan barang hilang: " + error.message);
  }
};

// RETURNED ITEMS
export const saveReturnedItemReport = async (reportData, adminUid) => {
  try {
    const docRef = await addDoc(collection(db, "returned_items"), {
      ...reportData,
      returnedAt: serverTimestamp(),
      confirmedBy: adminUid, // Menyimpan UID admin yang mengonfirmasi
    });
    console.log("Saved returned item report:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving returned item:", error.code, error.message);
    throw new Error(
      "Gagal menyimpan laporan barang ditemukan: " + error.message
    );
  }
};

// DELETE REPORT
export const deleteReport = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id));
    console.log(`Deleted report ${id} from ${collectionName}`);
  } catch (error) {
    console.error(
      `Error deleting ${collectionName} report ${id}:`,
      error.code,
      error.message
    );
    throw new Error(
      `Gagal menghapus laporan dari ${collectionName}: ` + error.message
    );
  }
};

// REALTIME LISTENERS
export const setupReportsListener = (collectionName, callback) => {
  try {
    return onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log(
          `Received ${collectionName} snapshot with ${data.length} items`
        );
        callback(data);
      },
      (error) => {
        console.error(
          `Error in ${collectionName} listener:`,
          error.code,
          error.message
        );
      }
    );
  } catch (error) {
    console.error(
      `Error setting up ${collectionName} listener:`,
      error.code,
      error.message
    );
  }
};

// MOVE REPORT FROM LOST TO RETURNED
export const moveReportToReturned = async (report, adminUid) => {
  try {
    // Persiapkan data untuk koleksi returned_items
    const returnedData = {
      ...report,
      returnedAt: serverTimestamp(),
      confirmedBy: adminUid, // Menyimpan UID admin yang mengonfirmasi
    };

    // Hapus id dari object yang akan disimpan
    const { id, ...dataWithoutId } = returnedData;

    // Simpan ke koleksi returned_items
    const docRef = await addDoc(
      collection(db, "returned_items"),
      dataWithoutId
    );
    console.log("Moved report to returned_items:", docRef.id);

    // Hapus dari lost_items
    await deleteDoc(doc(db, "lost_items", report.id));
    console.log("Deleted report from lost_items:", report.id);

    return docRef.id;
  } catch (error) {
    console.error(
      "Error moving report to returned items:",
      error.code,
      error.message
    );
    throw new Error(
      "Gagal memindahkan laporan ke barang ditemukan: " + error.message
    );
  }
};
