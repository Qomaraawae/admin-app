import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-toastify';
import { deleteReport, moveReportToReturned } from '../config/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend as RechartsLegend, PieChart, Pie, Cell } from 'recharts';
import ReportTable from '../components/ReportTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faCheckCircle, faTrash, faCheckSquare } from '@fortawesome/free-solid-svg-icons';

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [lostReports, setLostReports] = useState([]);
  const [returnedReports, setReturnedReports] = useState([]);
  const [historyReports, setHistoryReports] = useState([]); // State untuk histori
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    if (!user || !isAdmin) {
      toast.error('Akses hanya untuk admin', { position: 'top-center' });
      navigate('/login');
    }
  }, [user, isAdmin, navigate]);

  useEffect(() => {
    const unsubscribeLost = onSnapshot(collection(db, 'lost_items'), (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLostReports(reports);
      updateChartData(reports, returnedReports);
    });

    const unsubscribeReturned = onSnapshot(collection(db, 'returned_items'), (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReturnedReports(reports);
      updateChartData(lostReports, reports);
    });

    const unsubscribeHistory = onSnapshot(collection(db, 'history_items'), (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryReports(reports);
    });

    setLoading(false);

    return () => {
      unsubscribeLost();
      unsubscribeReturned();
      unsubscribeHistory();
    };
  }, []);

  const updateChartData = (lost, returned) => {
    const monthlyData = {};
    [...lost, ...returned].forEach(report => {
      const date = new Date(report.tanggal?.seconds * 1000 || report.returnedAt?.seconds * 1000);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { lost: 0, returned: 0 };
      }
      if (report.tanggal) monthlyData[monthYear].lost++;
      if (report.returnedAt) monthlyData[monthYear].returned++;
    });

    const chartData = Object.keys(monthlyData).map(key => ({
      name: key,
      lost: monthlyData[key].lost,
      returned: monthlyData[key].returned,
    }));
    setChartData(chartData);

    const categoryCounts = {};
    [...lost, ...returned].forEach(report => {
      const category = report.kategori || 'Tidak Diketahui';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const categoryData = Object.keys(categoryCounts).map(key => ({
      name: key,
      value: categoryCounts[key],
    }));
    setCategoryData(categoryData);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logout berhasil!', { position: 'top-center' });
      navigate('/login');
    } catch (error) {
      toast.error(`Gagal logout: ${error.message}`, { position: 'top-center' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="ml-4 text-gray-600">Memuat data...</p>
      </div>
    );
  }

  const totalReports = lostReports.length + returnedReports.length;
  const returnRate = totalReports > 0 ? ((returnedReports.length / totalReports) * 100).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
          <button
            onClick={handleLogout}
            className="flex items-center text-red-600 hover:text-red-800 transition-colors"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Total Laporan</h3>
            <p className="text-3xl font-bold text-blue-600">{totalReports}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Barang Hilang</h3>
            <p className="text-3xl font-bold text-red-600">{lostReports.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700">Tingkat Pengembalian</h3>
            <p className="text-3xl font-bold text-green-600">{returnRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Tren Laporan per Bulan</h3>
            <LineChart width={500} height={300} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <RechartsLegend />
              <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Hilang" />
              <Line type="monotone" dataKey="returned" stroke="#10b981" name="Ditemukan" />
            </LineChart>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribusi Kategori</h3>
            <PieChart width={500} height={300}>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#ef4444', '#3b82f6', '#f59e0b'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <RechartsLegend />
            </PieChart>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Daftar Laporan</h3>
          <div className="flex space-x-6 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 mr-2" />
              <span>Konfirmasi Ditemukan</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faTrash} className="text-red-600 mr-2" />
              <span>Hapus Laporan</span>
            </div>
            <div className="flex items-center">
              <FontAwesomeIcon icon={faCheckSquare} className="text-blue-600 mr-2" />
              <span>Checklist (Barang Diambil)</span>
            </div>
          </div>
          <ReportTable
            lostReports={lostReports}
            returnedReports={returnedReports}
            onDelete={deleteReport}
            onConfirm={moveReportToReturned}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Histori Laporan</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gambar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Awal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diambil Pada</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historyReports.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      Belum ada histori laporan
                    </td>
                  </tr>
                ) : (
                  historyReports.map(report => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.foto ? (
                          <img
                            src={report.foto}
                            alt={`${report.namaBarang || 'Barang'} foto`}
                            className="h-16 w-16 object-cover rounded"
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
                        {report.takenAt ? new Date(report.takenAt.seconds * 1000).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
