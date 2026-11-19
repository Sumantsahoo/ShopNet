import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import { DISTRICTS_BY_STATE, INDIAN_STATES_AND_UTS } from '../utils/indiaAddress';
import './admin.css';

const EMPTY_FILTERS = { state: '', district: '', block: '', village: '' };

const formatJoinedDate = (account) => {
    if (account.joinedAt) return new Date(account.joinedAt).toLocaleDateString('en-IN');
    const timestamp = account._id?.slice(0, 8);
    return timestamp && /^[a-f\d]{8}$/i.test(timestamp)
        ? new Date(Number.parseInt(timestamp, 16) * 1000).toLocaleDateString('en-IN')
        : '—';
};

const AdminUsers = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
    const [locationOptions, setLocationOptions] = useState({ blocks: [], villages: [] });
    const [locationOptionsLoading, setLocationOptionsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [locationOptionsError, setLocationOptionsError] = useState('');

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return undefined;
        }
        if (!['admin', 'employee'].includes(user.role)) {
            setLoading(false);
            return undefined;
        }

        let cancelled = false;
        const loadUsers = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({ page: String(page) });
                Object.entries(appliedFilters).forEach(([field, value]) => {
                    if (value) params.set(field, value);
                });
                const response = await apiFetch(`/api/authorite/user?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load customers.');
                if (!cancelled) {
                    setUsers(data.users);
                    setTotal(data.total);
                    setPage(data.page);
                    setPages(data.pages);
                }
            } catch (fetchError) {
                if (!cancelled) setError(fetchError.message || 'Could not load customers.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        loadUsers();
        return () => { cancelled = true; };
    }, [appliedFilters, navigate, page, user?.role, user?.token]);

    useEffect(() => {
        if (!user?.token || !['admin', 'employee'].includes(user.role)) return undefined;
        if (!filters.state || !filters.district) {
            setLocationOptions({ blocks: [], villages: [] });
            setLocationOptionsLoading(false);
            setLocationOptionsError('');
            return undefined;
        }

        let cancelled = false;
        const loadLocationOptions = async () => {
            setLocationOptionsLoading(true);
            setLocationOptionsError('');
            try {
                const params = new URLSearchParams({
                    state: filters.state,
                    district: filters.district
                });
                if (filters.block) params.set('block', filters.block);
                const response = await apiFetch(`/api/authorite/user/location-options?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load block and village options.');
                if (!cancelled) setLocationOptions(data);
            } catch (fetchError) {
                if (!cancelled) setLocationOptionsError(fetchError.message || 'Could not load block and village options.');
            } finally {
                if (!cancelled) setLocationOptionsLoading(false);
            }
        };
        loadLocationOptions();
        return () => { cancelled = true; };
    }, [filters.block, filters.district, filters.state, user?.role, user?.token]);

    const applyFilters = (event) => {
        event.preventDefault();
        setPage(1);
        setAppliedFilters({ ...filters });
    };

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setPage(1);
        setAppliedFilters(EMPTY_FILTERS);
    };

    if (!['admin', 'employee'].includes(user?.role)) {
        return <main className="admin-page"><p className="admin-alert">Customer management access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / CUSTOMER OPERATIONS</p><h1>Customers</h1></div>
            </header>
            <section className="admin-settings-card customer-filter-card">
                <h2>Filter by delivery location</h2>
                <p>Customer totals update after you apply each location filter. Block and village are recorded when a customer saves an address or checks out.</p>
                <form className="admin-edit-form customer-filter-form" onSubmit={applyFilters}>
                    <label>State / union territory
                        <select
                            value={filters.state}
                            onChange={(event) => setFilters({ state: event.target.value, district: '', block: '', village: '' })}
                        >
                            <option value="">All states and union territories</option>
                            {INDIAN_STATES_AND_UTS.map((state) => <option key={state} value={state}>{state}</option>)}
                        </select>
                    </label>
                    <label>District
                        {DISTRICTS_BY_STATE[filters.state]?.length ? (
                            <select value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value, block: '', village: '' })}>
                                <option value="">All districts</option>
                                {DISTRICTS_BY_STATE[filters.state].map((district) => <option key={district} value={district}>{district}</option>)}
                            </select>
                        ) : (
                            <input value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value, block: '', village: '' })} placeholder={filters.state ? 'Enter district' : 'Select a state first'} disabled={!filters.state} maxLength={100} />
                        )}
                    </label>
                    <label>Block
                        {locationOptions.blocks.length ? (
                            <select
                                value={filters.block}
                                disabled={!filters.district || locationOptionsLoading}
                                onChange={(event) => setFilters({ ...filters, block: event.target.value, village: '' })}
                            >
                                <option value="">All blocks</option>
                                {Array.from(new Set([...locationOptions.blocks, ...(filters.block ? [filters.block] : [])])).map((block) => <option key={block} value={block}>{block}</option>)}
                            </select>
                        ) : (
                            <input value={filters.block} onChange={(event) => setFilters({ ...filters, block: event.target.value, village: '' })} maxLength={100} disabled={!filters.district || locationOptionsLoading} placeholder={locationOptionsLoading ? 'Loading blocks...' : 'Enter a block'} />
                        )}
                    </label>
                    <label>Village
                        {locationOptions.villages.length ? (
                            <select
                                value={filters.village}
                                disabled={!filters.block || locationOptionsLoading}
                                onChange={(event) => setFilters({ ...filters, village: event.target.value })}
                            >
                                <option value="">All villages</option>
                                {Array.from(new Set([...locationOptions.villages, ...(filters.village ? [filters.village] : [])])).map((village) => <option key={village} value={village}>{village}</option>)}
                            </select>
                        ) : (
                            <input value={filters.village} onChange={(event) => setFilters({ ...filters, village: event.target.value })} maxLength={100} disabled={!filters.block || locationOptionsLoading} placeholder={locationOptionsLoading ? 'Loading villages...' : 'Enter a village'} />
                        )}
                    </label>
                    <div className="customer-filter-actions">
                        <button className="admin-action" type="submit">Apply filters</button>
                        <button className="admin-profile-link" type="button" onClick={clearFilters}>Clear filters</button>
                    </div>
                </form>
            </section>
            <p className="customer-count" aria-live="polite">
                {loading ? 'Updating customer count...' : `${total.toLocaleString('en-IN')} customer${total === 1 ? '' : 's'} match these filters.`}
            </p>
            {locationOptionsError && <p className="admin-alert" role="alert">{locationOptionsError}</p>}
            {error && <p className="admin-alert" role="alert">{error}</p>}
            {!error && (
                <>
                    {loading ? <p className="admin-status">Loading customers...</p> : (
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead><tr><th>Name</th><th>Email</th><th>State</th><th>District</th><th>Block</th><th>Village</th><th>Joined</th><th>Last login</th></tr></thead>
                                <tbody>
                                    {users.map((account) => (
                                        <tr key={account._id}>
                                            <td>{account.name}</td>
                                            <td>{account.email}</td>
                                            <td>{account.defaultAddress?.state || '—'}</td>
                                            <td>{account.defaultAddress?.district || '—'}</td>
                                            <td>{account.defaultAddress?.block || '—'}</td>
                                            <td>{account.defaultAddress?.village || '—'}</td>
                                            <td>{formatJoinedDate(account)}</td>
                                            <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && <tr><td colSpan="8">No customers match these filters.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <nav className="customer-pagination" aria-label="Customer pages">
                        <button className="admin-profile-link" type="button" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                        <span>Page {page} of {Math.max(pages, 1)}</span>
                        <button className="admin-profile-link" type="button" disabled={loading || page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button>
                    </nav>
                </>
            )}
        </main>
    );
};

export default AdminUsers;
