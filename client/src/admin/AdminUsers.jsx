import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './admin.css';

const AdminUsers = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const formatJoinedDate = (account) => {
        if (account.joinedAt) return new Date(account.joinedAt).toLocaleDateString('en-IN');
        const timestamp = account._id?.slice(0, 8);
        return timestamp && /^[a-f\d]{8}$/i.test(timestamp)
            ? new Date(Number.parseInt(timestamp, 16) * 1000).toLocaleDateString('en-IN')
            : '—';
    };

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }
        if (user.role !== 'admin') {
            setLoading(false);
            return;
        }

        const loadUsers = async () => {
            try {
                const response = await apiFetch('/api/authorite/user', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load users.');
                setUsers(data.filter((account) => account.role !== 'admin'));
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load users.');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, [user, navigate]);

    if (user?.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading"><div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>Customers</h1></div></header>
            {loading && <p className="admin-status">Loading customers...</p>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {!loading && !error && (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Last login</th></tr></thead>
                        <tbody>
                            {users.map((account) => (
                                <tr key={account._id}>
                                    <td>{account.name}</td>
                                    <td>{account.email}</td>
                                    <td>{formatJoinedDate(account)}</td>
                                    <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</td>
                                </tr>
                            ))}
                            {users.length === 0 && <tr><td colSpan="4">No customers found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
};

export default AdminUsers;