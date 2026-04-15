import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

export default function UpdateMarksPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const markFromState = location.state?.mark || null;

  const [form, setForm] = useState({
    testName: '',
    marksObtained: '',
    totalMarks: ''
  });
  const [recordInfo, setRecordInfo] = useState({ className: '', subject: '', studentId: '', studentName: '' });
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!isTeacher || !id) return;

      if (markFromState && String(markFromState._id) === String(id)) {
        setForm({
          testName: markFromState.testName || '',
          marksObtained: String(markFromState.marksObtained ?? ''),
          totalMarks: String(markFromState.totalMarks ?? '')
        });
        setRecordInfo({
          className: markFromState.className || '',
          subject: markFromState.subject || '',
          studentId: markFromState.studentId || '',
          studentName: location.state?.studentName || ''
        });
        setReady(true);
        return;
      }

      try {
        setError('');
        const response = await API.get(`/marks/${id}`);
        const item = response.data;

        setForm({
          testName: item?.testName || '',
          marksObtained: String(item?.marksObtained ?? ''),
          totalMarks: String(item?.totalMarks ?? '')
        });
        setRecordInfo({
          className: item?.className || '',
          subject: item?.subject || '',
          studentId: item?.studentId || '',
          studentName: ''
        });
      } catch (err) {
        try {
          const fallbackResponse = await API.get('/marks');
          const item = (fallbackResponse.data || []).find((row) => String(row._id) === String(id));

          if (!item) {
            setError(err.response?.data?.msg || 'Unable to load marks record');
          } else {
            setForm({
              testName: item?.testName || '',
              marksObtained: String(item?.marksObtained ?? ''),
              totalMarks: String(item?.totalMarks ?? '')
            });
            setRecordInfo({
              className: item?.className || '',
              subject: item?.subject || '',
              studentId: item?.studentId || '',
              studentName: ''
            });
          }
        } catch {
          setError(err.response?.data?.msg || 'Unable to load marks record');
        }
      } finally {
        setReady(true);
      }
    };

    load();
  }, [id, isTeacher, location.state, markFromState]);

  const save = async () => {
    try {
      setLoading(true);
      setError('');
      setToast('');

      const parsedObtained = Number(form.marksObtained);
      const parsedTotal = Number(form.totalMarks);

      if (!form.testName.trim()) {
        setError('Test name is required');
        return;
      }

      if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
        setError('Total marks must be a positive number');
        return;
      }

      if (!Number.isFinite(parsedObtained) || parsedObtained < 0 || parsedObtained > parsedTotal) {
        setError('Marks obtained must be between 0 and total marks');
        return;
      }

      const payload = {
        testName: form.testName,
        marksObtained: parsedObtained,
        totalMarks: parsedTotal
      };

      try {
        await API.put(`/marks/${id}`, payload);
      } catch {
        // Fallback for environments where the PUT route is not active yet.
        if (!recordInfo.className || !recordInfo.subject || !recordInfo.studentId) {
          throw new Error('Missing record context for fallback update');
        }

        await API.post('/marks/upload', {
          className: recordInfo.className,
          subject: recordInfo.subject,
          testName: form.testName,
          totalMarks: parsedTotal,
          marks: [{ studentId: recordInfo.studentId, marksObtained: parsedObtained }]
        });
      }

      setToast('Marks updated successfully');

      window.setTimeout(() => {
        navigate('/marks-list');
      }, 800);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to update marks');
    } finally {
      setLoading(false);
    }
  };

  if (!isTeacher) {
    return (
      <PageShell title="Update Marks" subtitle="Teacher-only page.">
        <section className="panel">
          <p>This page is available to teachers only.</p>
          <Link className="btn btn--secondary" to="/marks-list">Back to marks list</Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Update Marks"
      subtitle="Edit marks details for the selected student record."
      actions={[
        <Link key="back" className="btn btn--secondary" to="/marks-list">Back to marks list</Link>
      ]}
    >
      {error ? <div className="alert alert--error">{error}</div> : null}
      {toast ? <div className="toast toast--success">{toast}</div> : null}

      <section className="panel">
        <h2>Marks Record</h2>
        <p>
          {recordInfo.className} • {recordInfo.subject}
          {recordInfo.studentName ? ` • ${recordInfo.studentName}` : ''}
        </p>

        {ready ? (
          <div className="form-grid form-grid--3 mt-4">
            <input
              className="input"
              placeholder="Test name"
              value={form.testName}
              onChange={(e) => setForm((prev) => ({ ...prev, testName: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Marks obtained"
              value={form.marksObtained}
              onChange={(e) => setForm((prev) => ({ ...prev, marksObtained: e.target.value }))}
            />
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Total marks"
              value={form.totalMarks}
              onChange={(e) => setForm((prev) => ({ ...prev, totalMarks: e.target.value }))}
            />
          </div>
        ) : (
          <p>Loading record...</p>
        )}

        <div className="chip-row mt-4">
          <button className="btn btn--primary" type="button" onClick={save} disabled={!ready || loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </button>
          <Link className="btn btn--secondary" to="/marks-list">Cancel</Link>
        </div>
      </section>
    </PageShell>
  );
}
