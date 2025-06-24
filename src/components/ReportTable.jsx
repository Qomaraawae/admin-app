import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTrash, faCheckSquare } from '@fortawesome/free-solid-svg-icons';
import { deleteDoc, doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

const ReportTable = ({ lostReports, returnedReports, onDelete, onConfirm }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const handleDelete = async (id, collectionName) => {
    try {
      await onDelete(collectionName, id);
      toast.success('Laporan berhasil dihapus!', { position: 'top-center' });
    } catch (error) {
      toast.error(`Gagal menghapus: ${error.message}`, { position: 'top-center' });
    }
  };

  const handleConfirm = async (report) => {
    try {
      await onConfirm(report);
      toast.success('Barang dikonfirmasi ditemukan!', { position: 'top-center' });
    } catch (error) {
      toast.error(`Gagal mengkonfirmasi: ${error.message}`, { position: 'top-center' });
    }
  };

  const handleChecklist = async (report) => {
    try {
      // Hapus dari koleksi asli (lost_items atau returned_items)
      const collectionName = report.type === 'lost' ? 'lost_items' : 'returned_items';
      await deleteDoc(doc(db, collectionName, report.id));

      // Simpan ke histori
      const historyRef = doc(collection(db, 'history_items'));
      await setDoc(historyRef, {
        ...report,
        takenAt: new Date(),
        status: 'taken',
      });

      toast.success('Barang telah diambil dan diarsipkan ke histori!', { position: 'top-center' });
    } catch (error) {
      toast.error(`Gagal memproses checklist: ${error.message}`, { position: 'top-center' });
    }
  };

  const allReports = [
    ...lostReports.map(report => ({ ...report, type: 'lost' })),
    ...returnedReports.map(report => ({ ...report, type: 'returned' })),
  ];

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barang</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {allReports.map(report => (
            <tr key={report.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {report.foto ? (
                  <img
                    src={report.foto}
                    alt={`${report.namaBarang || 'Barang'} foto`}
                    className="h-16 w-16 object-cover rounded cursor-pointer"
                    onClick={() => setSelectedImage(report.foto)}
                  />
                ) : (
                  '-'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.namaBarang || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{report.kategori || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {report.type === 'lost' ? 'Hilang' : 'Ditemukan'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {report.type === 'lost' ? formatDate(report.tanggal) : formatDate(report.returnedAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {report.type === 'lost' && (
                  <button
                    onClick={() => handleConfirm(report)}
                    className="text-green-600 hover:text-green-800 mr-4"
                    title="Konfirmasi Ditemukan"
                  >
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(report.id, report.type === 'lost' ? 'lost_items' : 'returned_items')}
                  className="text-red-600 hover:text-red-800 mr-4"
                  title="Hapus Laporan"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
                <button
                  onClick={() => handleChecklist(report)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Checklist (Barang Diambil)"
                >
                  <FontAwesomeIcon icon={faCheckSquare} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allReports.length === 0 && (
        <p className="text-center text-gray-500 py-4">Belum ada laporan</p>
      )}

      {/* Modal untuk menampilkan gambar */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white p-4 rounded-lg max-w-4xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl"
              onClick={closeModal}
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Review gambar"
              className="max-h-[80vh] max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportTable;
