import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './admin.css';

const formatDate = (value) => value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : '—';

const AdminEmployees = () => {
    const { user } = useContext(AuthContext);
    const [employees, setEmployees] = useState([]);
    const [logs, setLogs] = useState([]);
    const [possibleEmployeeAccounts, setPossibleEmployeeAccounts] = useState([]);
    const [search, setSearch] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [searched, setSearched] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [position, setPosition] = useState('');
    const [companyId, setCompanyId] = useState('SHOPNEST');
    const [editingId, setEditingId] = useState('');
    const [editingPosition, setEditingPosition] = useState('');
    const [editingCompanyId, setEditingCompanyId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadEmployees = async () => {
        const response = await apiFetch('/api/staff/cofounder/employees', {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load employee records.');
        setEmployees(data.employees);
        setLogs(data.logs);
        setPossibleEmployeeAccounts(data.possibleEmployeeAccounts || []);
    };

    useEffect(() => {
        if (!user?.token || user.role !== 'admin') {
            setLoading(false);
            return undefined;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const response = await apiFetch('/api/staff/cofounder/employees', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Could not load employee records.');
                if (!cancelled) {
                    setEmployees(data.employees);
                    setLogs(data.logs);
                    setPossibleEmployeeAccounts(data.possibleEmployeeAccounts || []);
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load employee records.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [user?.role, user?.token]);

    const findAccounts = async (event) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setSelectedCandidate(null);
        setSearched(true);
        try {
            const response = await apiFetch(`/api/staff/cofounder/employee-candidates?search=${encodeURIComponent(search.trim())}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not search registered accounts.');
            setCandidates(data);
        } catch (searchError) {
            setError(searchError.message || 'Could not search registered accounts.');
        }
    };

    const assignEmployee = async (event) => {
        event.preventDefault();
        if (!selectedCandidate) {
            setError('Search for and select a registered user account first.');
            return;
        }
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await apiFetch('/api/staff/cofounder/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify({ userId: selectedCandidate._id, position, companyId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not assign this employee.');
            setMessage(data.message);
            setCandidates([]);
            setSelectedCandidate(null);
            setSearch('');
            setSearched(false);
            setPosition('');
            await loadEmployees();
        } catch (saveError) {
            setError(saveError.message || 'Could not assign this employee.');
        } finally {
            setSaving(false);
        }
    };

    const deactivateEmployee = async (employee) => {
        if (!window.confirm(`Disable access for ${employee.name}? They will no longer be able to sign in, and attendance history will be retained.`)) return;
        setError('');
        setMessage('');
        try {
            const response = await apiFetch(`/api/staff/cofounder/employees/${employee._id}/deactivate`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not disable this employee account.');
            setMessage(data.message);
            await loadEmployees();
        } catch (saveError) {
            setError(saveError.message || 'Could not disable this employee account.');
        }
    };

    const activateEmployee = async (employee) => {
        if (!window.confirm(`Restore sign-in access for ${employee.name}?`)) return;
        setError('');
        setMessage('');
        try {
            const response = await apiFetch(`/api/staff/cofounder/employees/${employee._id}/activate`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not activate this employee account.');
            setMessage(data.message);
            await loadEmployees();
        } catch (saveError) {
            setError(saveError.message || 'Could not activate this employee account.');
        }
    };

    const startEditingEmployee = (employee) => {
        setEditingId(employee._id);
        setEditingPosition(employee.employeePosition);
        setEditingCompanyId(employee.employeeCompanyId);
    };

    const saveEmployee = async (event, employee) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await apiFetch(`/api/staff/cofounder/employees/${employee._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify({ position: editingPosition, companyId: editingCompanyId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update this employee record.');
            setMessage(data.message);
            setEditingId('');
            await loadEmployees();
        } catch (saveError) {
            setError(saveError.message || 'Could not update this employee record.');
        } finally {
            setSaving(false);
        }
    };

    if (user?.role !== 'admin') {
        return <main className="admin-page"><p className="admin-alert">Admin access required.</p></main>;
    }

    return (
        <main className="admin-page">
            <header className="admin-heading">
                <div><p className="admin-eyebrow">SHOPNEST / ADMIN</p><h1>Employee management</h1></div>
                <Link className="admin-profile-link" to="/admin">Back to dashboard</Link>
            </header>
            <section className="admin-settings-card">
                <h2>Assign an employee</h2>
                <p>Employees create their own account first. Verify the person, then assign their job title and company ID here. Email text alone (including “shopnest”) never grants employee or co-founder access; no shared passwords are created.</p>
                <form className="admin-edit-form" onSubmit={findAccounts}>
                    <label>Find a registered account by name or email<input value={search} onChange={(event) => { setSearch(event.target.value); setSearched(false); setCandidates([]); setSelectedCandidate(null); }} minLength={2} maxLength={80} required /></label>
                    <button className="admin-action" type="submit">Search accounts</button>
                </form>
                {candidates.length > 0 && (
                    <div className="employee-candidate-list" role="group" aria-label="Matching account candidates">
                        {candidates.map((candidate) => (
                            <button
                                type="button"
                                className={selectedCandidate?._id === candidate._id ? 'is-selected' : ''}
                                key={candidate._id}
                                onClick={() => setSelectedCandidate(candidate)}
                            >
                                <strong>{candidate.name}</strong><span>{candidate.email}</span>
                            </button>
                        ))}
                    </div>
                )}
                {searched && candidates.length === 0 && <p className="admin-status">No unassigned accounts found. The employee must register before you can assign a position.</p>}
                {selectedCandidate && (
                    <form className="admin-edit-form employee-assignment-form" onSubmit={assignEmployee}>
                        <p>Selected account: <strong>{selectedCandidate.name}</strong> · {selectedCandidate.email}</p>
                        <label>Position / job title<input value={position} onChange={(event) => setPosition(event.target.value)} minLength={2} maxLength={80} placeholder="Frontend Developer" required /></label>
                        <label>Company ID<input value={companyId} onChange={(event) => setCompanyId(event.target.value)} minLength={2} maxLength={40} required /></label>
                        <button className="admin-action" type="submit" disabled={saving}>{saving ? 'Assigning...' : 'Assign employee'}</button>
                    </form>
                )}
                <div className="employee-pending-accounts">
                    <h3>Possible employee accounts</h3>
                    <p>These are unassigned accounts whose email contains “shopnest”. This is only a review suggestion; it does not grant employee access.</p>
                    {possibleEmployeeAccounts.length ? (
                        <div className="employee-candidate-list" role="group" aria-label="Possible unassigned employee accounts">
                            {possibleEmployeeAccounts.map((candidate) => (
                                <button
                                    type="button"
                                    className={selectedCandidate?._id === candidate._id ? 'is-selected' : ''}
                                    key={candidate._id}
                                    onClick={() => setSelectedCandidate(candidate)}
                                >
                                    <strong>{candidate.name}</strong><span>{candidate.email}</span>
                                </button>
                            ))}
                        </div>
                    ) : <p className="admin-status">No unassigned accounts with “shopnest” in their email.</p>}
                </div>
            </section>

            {error && <p className="admin-alert" role="alert">{error}</p>}
            {message && <p className="admin-success" role="status">{message}</p>}
            <section className="admin-section-settings-card">
                <h2>Employees ({employees.length})</h2>
                {loading ? <p className="admin-status">Loading employees...</p> : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Position</th><th>Company ID</th><th>Status</th><th>Assigned</th><th>Access</th></tr></thead>
                            <tbody>
                                {employees.map((employee) => (
                                    <tr key={employee._id}>
                                        <td>{employee.name}</td>
                                        <td>{employee.email}</td>
                                        <td>{editingId === employee._id ? <input aria-label={`Position for ${employee.name}`} value={editingPosition} maxLength={80} onChange={(event) => setEditingPosition(event.target.value)} /> : employee.employeePosition}</td>
                                        <td>{editingId === employee._id ? <input aria-label={`Company ID for ${employee.name}`} value={editingCompanyId} maxLength={40} onChange={(event) => setEditingCompanyId(event.target.value)} /> : employee.employeeCompanyId}</td>
                                        <td>{employee.employmentStatus}</td>
                                        <td>{formatDate(employee.employeeStartedAt)}</td>
                                        <td>
                                            {editingId === employee._id ? (
                                                <form onSubmit={(event) => saveEmployee(event, employee)}>
                                                    <button className="admin-text-link" type="submit" disabled={saving}>Save</button>
                                                    {' · '}
                                                    <button className="admin-text-link" type="button" onClick={() => setEditingId('')}>Cancel</button>
                                                </form>
                                            ) : (
                                                <>
                                                    <button className="admin-text-link" type="button" onClick={() => startEditingEmployee(employee)}>Edit position</button>
                                                    {employee.accountDisabled ? (
                                                        <> · Disabled · <button className="admin-text-link" type="button" onClick={() => activateEmployee(employee)}>Activate account</button></>
                                                    ) : (
                                                        <> · <button className="admin-text-link" type="button" onClick={() => deactivateEmployee(employee)}>Disable account</button></>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && <tr><td colSpan="7">No employees assigned yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            <section className="admin-section-settings-card">
                <h2>Recent daily attendance and work updates</h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead><tr><th>Date</th><th>Employee</th><th>Position</th><th>Company ID</th><th>Check-in</th><th>Check-out</th><th>Work update</th></tr></thead>
                        <tbody>
                            {logs.map((entry) => (
                                <tr key={entry._id}>
                                    <td>{entry.workDate}</td><td>{entry.employeeName}</td><td>{entry.position}</td><td>{entry.companyId}</td>
                                    <td>{formatDate(entry.checkInAt)}</td><td>{formatDate(entry.checkOutAt)}</td><td>{entry.workSummary || '—'}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && <tr><td colSpan="7">No attendance records yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
};

export default AdminEmployees;
