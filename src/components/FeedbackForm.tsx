import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../config/api';

const FeedbackForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/save-feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feedback })
      });
      if (!response.ok) throw new Error('Error submitting feedback');
      setSubmitted(true);
    } catch (err) {
      setError('No se pudo enviar el feedback. Intenta de nuevo.');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-8 glass-panel rounded shadow">
      {submitted ? (
        <div className="text-center">
          ¡Gracias por tu feedback!
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold mb-4">Envíanos tu feedback</h2>
          <label className="block mb-2 text-sm">Correo electrónico (opcional):</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full mb-4 p-2 border rounded bg-white text-black"
            placeholder="tu@email.com"
          />
          <label className="block mb-2 text-sm">Comentarios:</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            required
            className="w-full mb-4 p-2 border rounded bg-white text-black"
            rows={5}
            placeholder="¿Qué te gustaría contarnos sobre la web?"
          />
          {error && <div className="text-destructive mb-2">{error}</div>}
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 mr-2">Enviar</button>
        </form>
      )}
      <button
        type="button"
        className="bg-secondary text-black px-4 py-2 rounded hover:bg-secondary/90 mt-4 w-full"
        onClick={() => navigate('/')}
      >
        Volver al inicio
      </button>
    </div>
  );
};

export default FeedbackForm;
