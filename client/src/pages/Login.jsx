import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [forgotPassword, setForgotPassword] = useState(false);
    const [resetCodeSent, setResetCodeSent] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setStatusMessage('');

        if (!login) {
            setErrorMessage('Authentication is unavailable. Please refresh the page and try again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/authorite/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setErrorMessage(data.message || 'Login failed.');
                return;
            }

            login(data);
            navigate(data.role === 'admin' ? '/admin/orders' : '/');
        } catch (error) {
            console.error('Login failed:', error);
            setErrorMessage('Something went wrong while logging in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestResetCode = async () => {
        setErrorMessage('');
        setStatusMessage('');
        if (!email) {
            setErrorMessage('Enter your account email address first.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/authorite/forgot-password/request-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok) {
                setErrorMessage(data.message || 'Could not send a password reset code.');
                return;
            }
            setResetCodeSent(true);
            setStatusMessage(data.message || 'If an account exists for that email, a password reset code will be sent.');
        } catch (error) {
            console.error('Password reset code request failed:', error);
            setErrorMessage('Something went wrong while requesting a reset code. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        setStatusMessage('');
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/authorite/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: resetOtp, newPassword })
            });
            const data = await response.json();
            if (!response.ok) {
                setErrorMessage(data.message || 'Could not change your password.');
                return;
            }

            setForgotPassword(false);
            setResetCodeSent(false);
            setResetOtp('');
            setNewPassword('');
            setPassword('');
            setStatusMessage('Password changed. Log in with your new password.');
        } catch (error) {
            console.error('Password reset failed:', error);
            setErrorMessage('Something went wrong while changing your password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const leavePasswordReset = () => {
        setForgotPassword(false);
        setResetCodeSent(false);
        setResetOtp('');
        setNewPassword('');
        setErrorMessage('');
        setStatusMessage('');
    };

    return (
        <div className="auth-container">
            <form
                onSubmit={forgotPassword && resetCodeSent ? handleResetPassword : handleSubmit}
                className="auth-form"
            >
                <h2>{forgotPassword ? 'Reset password' : 'Login'}</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                />
                {forgotPassword ? (
                    resetCodeSent ? (
                        <>
                            <p>Enter the six-digit code sent to your email and choose a new password.</p>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                placeholder="Password reset code"
                                value={resetOtp}
                                onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                            />
                            <input
                                type="password"
                                placeholder="New password (at least 8 characters)"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                                minLength={8}
                                required
                            />
                            <button type="submit" className="btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Changing password...' : 'Change password'}
                            </button>
                            <button type="button" className="auth-text-button" onClick={handleRequestResetCode} disabled={isSubmitting}>
                                Resend reset code
                            </button>
                        </>
                    ) : (
                        <>
                            <p>We’ll email a one-time code so you can set a new password.</p>
                            <button type="button" className="btn" onClick={handleRequestResetCode} disabled={isSubmitting}>
                                {isSubmitting ? 'Sending code...' : 'Send reset code'}
                            </button>
                        </>
                    )
                ) : (
                    <>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <button type="submit" className="btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </button>
                        <button type="button" className="auth-text-button" onClick={() => {
                            setForgotPassword(true);
                            setErrorMessage('');
                            setStatusMessage('');
                        }}>
                            Forgot password?
                        </button>
                    </>
                )}
                {errorMessage && <p role="alert">{errorMessage}</p>}
                {statusMessage && <p role="status">{statusMessage}</p>}
                {forgotPassword ? (
                    <button type="button" className="auth-text-button" onClick={leavePasswordReset}>
                        Back to login
                    </button>
                ) : (
                    <p>Don&apos;t have an account? <Link to="/register">Register</Link></p>
                )}
            </form>
        </div>
    );
};

export default Login;
