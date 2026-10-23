import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/auth.css';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        if (!login) {
            setMessage('Authentication is unavailable. Please refresh the page and try again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch('/api/authorite/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setMessage(data.message || 'Registration failed.');
                return;
            }

            login(data);
            navigate('/');
        } catch (error) {
            console.error('Registration failed:', error);
            setMessage('Something went wrong while creating your account. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Register</h2>
                <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                />
                {message && <p role="alert">{message}</p>}
                <button type="submit" className="btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Register'}
                </button>
                <p>Already have an account? <Link to="/login">Login</Link></p>
            </form>
        </div>
    );
};

export default Register;
