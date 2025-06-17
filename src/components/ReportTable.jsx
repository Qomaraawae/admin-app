import React from 'react';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTrash } from '@fortawesome/free-solid-svg-icons';

const ReportTable = ({ lostReports, returnedReports, onDelete, onConfirm }) => {
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

  const allReports = [
    ...lostReports.map(report => ({ ...report, type: 'lost' })),
    ...returnedReports.map(report => ({ ...report, type: 'returned' })),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
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
                  className="text-red-600 hover:text-red-800"
                  title="Hapus Laporan"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {allReports.length === 0 && (
        <p className="text-center text-gray-500 py-4">Belum ada laporan</p>
      )}
    </div>
  );
};

export default ReportTable;