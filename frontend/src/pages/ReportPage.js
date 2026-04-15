import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { getStoredUser } from '../utils/auth';

export default function ReportPage() {
  const user = getStoredUser();
  const isStudent = user?.role === 'student';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await API.get('/report/generate', { responseType: 'blob' });
      const pdfUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');

      setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 1000);
    } catch {
      setError('Unable to open the report right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page app-page--centered">
      <div className="auth-card">
        <p className="eyebrow">Student report</p>
        <h1>{isStudent ? 'Download your report' : 'Student-only report'}</h1>
        <p>
          {isStudent
            ? 'The backend generates a PDF report for student analytics.'
            : 'This endpoint is restricted to students by the backend.'}
        </p>
        {isStudent ? (
          <>
            <button className="btn btn--primary" type="button" onClick={openReport} disabled={loading}>
              {loading ? 'Opening report...' : 'Open report PDF'}
            </button>
            {error ? <div className="alert alert--error" style={{ marginTop: '16px' }}>{error}</div> : null}
          </>
        ) : (
          <Link className="btn btn--secondary" to="/dashboard">
            Go to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}