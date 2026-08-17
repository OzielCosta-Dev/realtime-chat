import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import extractErrorMessage from '../utils/extractErrorMessage.js';
import Brand from '../components/Brand.jsx';
import './AuthForm.css';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await register(form);
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
            <h1>Criar conta</h1>
            <p>Leva menos de um minuto</p>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <label>
            Nome
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              placeholder="Seu nome"
              minLength={2}
              maxLength={80}
              required
            />
          </label>

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
            {/* minLength aqui é só uma dica visual — o backend valida de
                novo, já que uma checagem só no navegador é trivialmente
                contornável (uma requisição curl direta pula o navegador
                inteiro). */}
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta…' : 'Criar conta'}
          </button>

          <p className="auth-switch">
            Já tem uma conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
