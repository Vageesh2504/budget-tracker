import React, { useState, FormEvent } from 'react';

interface SignupProps {
  onSuccess: (userId: number) => void;
  switchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSuccess, switchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.userId);
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/money-bg.jpg')] bg-cover bg-center">
      <div className="w-full max-w-md p-8 bg-white bg-opacity-80 rounded shadow">
        <h2 className="text-2xl mb-4">Create account</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-emerald-600 text-white p-2 rounded"
        >
          Sign up
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <button type="button" className="text-emerald-600" onClick={switchToLogin}>
          Login
        </button>
      </p>
      </div>
    </div>
  );
};

export default Signup;
