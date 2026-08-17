import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import Brand from '../components/Brand.jsx';
import './AuthForm.css';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already logged in (e.g. hit "back" after logging in) — don't show the
  // form again. Wait for isLoading first: on a hard refresh, AuthContext is
  // still validating the stored token at this exact moment, so checking
  // isAuthenticated alone would flash the form for a frame.
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Brand size="lg" />
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-heading">
            <h1>Bem-vindo de volta</h1>
            <p>Entre para continuar suas conversas</p>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="auth-switch">
            Não tem uma conta? <Link to="/register">Cadastre-se</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
