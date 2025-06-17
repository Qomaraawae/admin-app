import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-toastify';
import { deleteReport, moveReportToReturned } from '../config/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import ReportTable from '../components/ReportTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [lostReports, setLostReports] = useState([]);
  const [returnedReports, setReturnedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  // Proteksi rute untuk admin
  useEffect(() => {
    if (!user || !isAdmin) {
      toast.error('Akses hanya untuk admin', { position: 'top-center' });
      navigate('/login');
    }
  }, [user, isAdmin, navigate]);

  // Realtime listeners untuk laporan
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

    setLoading(false);

    return () => {
      unsubscribeLost();
      unsubscribeReturned();
    };
  }, []);

  // Fungsi untuk memperbarui data grafik
  const updateChartData = (lost, returned) => {
    // Grafik tren per bulan
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

    // Grafik distribusi kategori
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

        {/* Statistik */}
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

        {/* Grafik */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Tren Laporan per Bulan</h3>
            <LineChart width={500} height={300} data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
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
              <Legend />
            </PieChart>
          </div>
        </div>

        {/* Tabel Laporan */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Daftar Laporan</h3>
          <ReportTable
            lostReports={lostReports}
            returnedReports={returnedReports}
            onDelete={deleteReport}
            onConfirm={moveReportToReturned}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;