import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './admin.css';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }
        if (user.role !== 'admin') {
            setLoading(false);
            return;
        }

        const loadStats = async () => {
            try {
                const response = await apiFetch('/api/analytics', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load dashboard stats.');
                setStats(data);
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load dashboard stats.');
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user, navigate]);

    if (user?.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>Dashboard</h1></div>
                <Link className="admin-action" to="/admin/products/new">Add product</Link>
            </header>
            {loading && <p className="admin-status">Loading dashboard...</p>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {stats && (
                <section className="admin-stats" aria-label="Store statistics">
                    <article><span>Customers</span><strong>{stats.totalUsers}</strong></article>
                    <article><span>Products</span><strong>{stats.totalProducts}</strong></article>
                    <article><span>Orders</span><strong>{stats.totalOrders}</strong></article>
                    <article><span>Paid orders</span><strong>{stats.totalPaidOrders}</strong></article>
                    <article><span>Revenue</span><strong>₹{Number(stats.totalRevenue || 0).toLocaleString('en-IN')}</strong></article>
                    <article className="admin-stat-unavailable">
                        <span>Profit / loss</span>
                        <strong>Not tracked</strong>
                        <small>Product costs and expenses are not recorded.</small>
                    </article>
                </section>
            )}
            <nav className="admin-shortcuts" aria-label="Admin management">
                <Link to="/admin/products/edit">Edit products <span>Manage the catalog</span></Link>
                <Link to="/admin/users">Customers <span>View registered users</span></Link>
                <Link to="/admin/orders">Orders <span>Review and update orders</span></Link>
            </nav>
        </main>
    );
};

export default AdminDashboard;