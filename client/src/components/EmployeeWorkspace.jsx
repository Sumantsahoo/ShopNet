import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/employee.css';

const formatTime = (value) => value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : '—';

const EmployeeWorkspace = ({ user }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [workspace, setWorkspace] = useState(null);
    const [workSummary, setWorkSummary] = useState('');
    const [showCheckoutForm, setShowCheckoutForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadWorkspace = useCallback(async () => {
        const response = await apiFetch('/api/staff/employee/me', {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load employee work status.');
        setWorkspace(data);
    }, [user.token]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                await loadWorkspace();
            } catch (loadError) {
                if (!cancelled) setError(loadError.message || 'Could not load employee work status.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [loadWorkspace]);

    const runAttendanceAction = async (path, body = {}) => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const response = await apiFetch(path, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update your work status.');
            setMessage(data.message);
            setShowCheckoutForm(false);
            setWorkSummary('');
            await loadWorkspace();
        } catch (actionError) {
            setError(actionError.message || 'Could not update your work status.');
        } finally {
            setSaving(false);
        }
    };

    const today = workspace?.today;
    const checkedOut = Boolean(today?.checkOutAt);

    return (
        <main className="employee-workspace">
            <header className="employee-workspace-heading">
                <div>
                    <span>SHOPNEST 365 · EMPLOYEE WORKSPACE</span>
                    <h1>Hi {workspace?.employee.position || user.employeePosition || 'Employee'}, welcome to your work</h1>
                    <p>{workspace?.employee.name || user.name} · Company ID: {workspace?.employee.companyId || user.employeeCompanyId || '—'}</p>
                </div>
                <button type="button" className="employee-logout" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
            </header>

            {error && <p className="employee-message is-error" role="alert">{error}</p>}
            {message && <p className="employee-message" role="status">{message}</p>}
            {loading ? <p className="employee-status">Loading today’s work status...</p> : (
                <section className="employee-attendance-card">
                    <div className="employee-attendance-details">
                        <span>DAILY ATTENDANCE</span>
                        <h2>{today ? 'Today’s work session' : 'Ready to start your day?'}</h2>
                        <p>Check-in: <strong>{formatTime(today?.checkInAt)}</strong></p>
                        <p>Check-out: <strong>{formatTime(today?.checkOutAt)}</strong></p>
                        {today?.workSummary && <p className="employee-work-summary"><strong>Today’s update:</strong> {today.workSummary}</p>}
                    </div>
                    {!today ? (
                        <button className="employee-primary-action" type="button" disabled={saving} onClick={() => runAttendanceAction('/api/staff/employee/check-in')}>
                            {saving ? 'Checking in...' : 'Check in'}
                        </button>
                    ) : !checkedOut && !showCheckoutForm ? (
                        <button className="employee-primary-action" type="button" onClick={() => setShowCheckoutForm(true)}>Check out</button>
                    ) : !checkedOut ? (
                        <form className="employee-checkout-form" onSubmit={(event) => {
                            event.preventDefault();
                            runAttendanceAction('/api/staff/employee/check-out', { workSummary });
                        }}>
                            <label htmlFor="employee-work-summary">What did you work on today?</label>
                            <textarea
                                id="employee-work-summary"
                                value={workSummary}
                                onChange={(event) => setWorkSummary(event.target.value)}
                                minLength={3}
                                maxLength={1200}
                                required
                                rows={4}
                            />
                            <button className="employee-primary-action" type="submit" disabled={saving}>
                                {saving ? 'Saving update...' : 'Submit update & check out'}
                            </button>
                        </form>
                    ) : <p className="employee-day-complete">Your check-out and daily update are recorded.</p>}
                </section>
            )}

            {workspace?.recent?.length > 0 && (
                <section className="employee-history-card">
                    <h2>Recent daily updates</h2>
                    {workspace.recent.map((entry) => (
                        <article key={entry._id}>
                            <strong>{entry.workDate}</strong>
                            <span>{formatTime(entry.checkInAt)} – {formatTime(entry.checkOutAt)}</span>
                            <p>{entry.workSummary || 'No check-out update recorded.'}</p>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
};

export default EmployeeWorkspace;
