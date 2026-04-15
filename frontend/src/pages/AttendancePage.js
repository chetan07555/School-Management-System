import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { onStudentDataUpdate } from '../services/socket';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

const canonicalClassKey = (value) => String(value || '').trim().toUpperCase().replace(/^CLASS\s+/, '');

export default function AttendancePage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [data, setData] = useState({ records: [], percentage: 0, comparison: null });
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthFilter, setMonthFilter] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const classNames = useMemo(
    () => Array.from(new Set(classes.map((item) => item.className))).sort((a, b) => a.localeCompare(b)),
    [classes]
  );

  const subjectsForSelectedClass = useMemo(
    () => Array.from(new Set(classes.filter((item) => item.className === selectedClassName).map((item) => item.subject))).sort((a, b) => a.localeCompare(b)),
    [classes, selectedClassName]
  );

  const normalizedRecords = useMemo(() => {
    const subjectByClassTeacher = new Map(
      classes.map((item) => [`${canonicalClassKey(item.className)}|${String(item.teacherId || '')}`, item.subject])
    );

    return (data.records || []).map((record) => {
      if (record.subject) {
        return record;
      }

      const key = `${canonicalClassKey(record.className)}|${String(record.markedBy || '')}`;
      const resolvedSubject = subjectByClassTeacher.get(key) || 'Unknown';
      return { ...record, subject: resolvedSubject };
    });
  }, [data.records, classes]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await API.get('/classes');
        const items = response.data || [];
        setClasses(items);
        const firstClassName = items[0]?.className || '';
        const firstSubject = items[0]?.subject || '';
        setSelectedClassName((prev) => prev || firstClassName);
        setSelectedSubject((prev) => prev || firstSubject);
      } catch {
        setError('Unable to load classes');
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isTeacher) return;
    if (!selectedClassName) return;

    if (!subjectsForSelectedClass.length) {
      setSelectedSubject('');
      return;
    }

    if (!subjectsForSelectedClass.includes(selectedSubject)) {
      setSelectedSubject(subjectsForSelectedClass[0]);
    }
  }, [isTeacher, selectedClassName, subjectsForSelectedClass, selectedSubject]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const query = isTeacher && selectedClassName && selectedSubject ? { className: selectedClassName, subject: selectedSubject } : {};
        const response = await API.get('/attendance', { params: query });
        setData(response.data || { records: [], percentage: 0, comparison: null });
      } catch {
        setError('Unable to load attendance');
      }
    };
    loadData();
  }, [isTeacher, selectedClassName, selectedSubject]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!isTeacher || !selectedClassName) return;
      try {
        const response = await API.get('/classes/students', { params: { className: selectedClassName } });
        const items = response.data || [];
        setRoster(items.map((student) => ({ studentId: student._id, name: student.name, rollNumber: student.rollNumber || student.class, status: 'Absent' })));
      } catch {
        setRoster([]);
      }
    };
    loadStudents();
  }, [isTeacher, selectedClassName]);

  const filteredRecords = useMemo(() => {
    if (isTeacher || !monthFilter) return normalizedRecords;
    return normalizedRecords.filter((item) => item.date && new Date(item.date).toISOString().slice(0, 7) === monthFilter);
  }, [normalizedRecords, isTeacher, monthFilter]);

  const subjectWiseAttendance = useMemo(() => {
    if (isTeacher) return [];

    const grouped = filteredRecords.reduce((acc, row) => {
      const subject = String(row.subject || 'Unknown').trim() || 'Unknown';
      if (!acc[subject]) {
        acc[subject] = { attended: 0, total: 0 };
      }

      acc[subject].total += 1;
      if (row.status === 'Present') {
        acc[subject].attended += 1;
      }

      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([subject, stats]) => ({
        subject,
        attended: stats.attended,
        total: stats.total,
        percentage: stats.total ? Number(((stats.attended / stats.total) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [filteredRecords, isTeacher]);

  const saveAttendance = async () => {
    try {
      setError('');
      await API.post('/attendance/upload', {
        className: selectedClassName,
        subject: selectedSubject,
        date: selectedDate,
        attendance: roster.map((item) => ({ studentId: item.studentId, status: item.status }))
      });
      const response = await API.get('/attendance', { params: { className: selectedClassName, subject: selectedSubject } });
      setData(response.data || { records: [], percentage: 0, comparison: null });
      setToast('Attendance saved successfully');
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to save attendance');
    }
  };

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
  }, []);

  // Listen for real-time attendance updates
  useEffect(() => {
    const unsubscribe = onStudentDataUpdate((update) => {
      if (update.type === 'attendance') {
        // Reload attendance data
        const loadData = async () => {
          try {
            const query = isTeacher && selectedClassName && selectedSubject ? { className: selectedClassName, subject: selectedSubject } : {};
            const response = await API.get('/attendance', { params: query });
            setData(response.data || { records: [], percentage: 0, comparison: null });
          } catch {
            console.error('Unable to reload attendance');
          }
        };
        loadData();
      }
    });

    return unsubscribe;
  }, [isTeacher, selectedClassName, selectedSubject]);

  return (
    <PageShell title="Attendance" subtitle="Track attendance records and class participation.">
      {error ? <div className="alert alert--error">{error}</div> : null}
      {toast ? <div className="toast toast--success">{toast}</div> : null}

      {isTeacher ? (
        <>
          <section className="panel">
            <h2>Mark attendance</h2>
            <div className="form-grid form-grid--4">
              <select className="input" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
                {classNames.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjectsForSelectedClass.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              <button className="btn btn--primary" type="button" onClick={saveAttendance}>Save attendance</button>
            </div>

            <div className="table-wrap mt-3">
              <table className="table">
                <thead><tr><th>Name</th><th>Roll</th><th>Status</th></tr></thead>
                <tbody>
                  {roster.map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.name}</td>
                      <td>{row.rollNumber || '-'}</td>
                      <td>
                        <div className="status-toggle" role="group" aria-label={`Attendance status for ${row.name}`}>
                          <button
                            type="button"
                            className={`status-toggle__btn ${row.status === 'Present' ? 'status-toggle__btn--active' : ''}`}
                            onClick={() => setRoster((prev) => prev.map((item) => (item.studentId === row.studentId ? { ...item, status: 'Present' } : item)))}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`status-toggle__btn ${row.status === 'Absent' ? 'status-toggle__btn--inactive' : ''}`}
                            onClick={() => setRoster((prev) => prev.map((item) => (item.studentId === row.studentId ? { ...item, status: 'Absent' } : item)))}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Saved records</h2>
            <div className="stats-grid">
              <article className="stat-card"><span>Attendance</span><strong>{data.percentage || 0}%</strong></article>
              <article className="stat-card"><span>Total records</span><strong>{(data.records || []).length}</strong></article>
            </div>
          </section>

          <section className="panel">
            <h2>View student wise lists</h2>
            <div className="page-hero__actions">
              <Link className="btn btn--secondary" to="/attendance-list">View attendance list</Link>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <h2>Your attendance</h2>
            <input className="input input--short" type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            <div className="stats-grid">
              <article className="stat-card"><span>Attendance</span><strong>{data.comparison?.yourAttendance || data.percentage || 0}%</strong></article>
              <article className="stat-card"><span>Class average</span><strong>{data.comparison?.classAverage || 0}%</strong></article>
            </div>

            <div className="table-wrap" style={{ marginBottom: '16px' }}>
              <table className="table">
                <thead><tr><th>Subject</th><th>Present From Total Classes</th><th>Attendance %</th><th>Details</th></tr></thead>
                <tbody>
                  {subjectWiseAttendance.length ? subjectWiseAttendance.map((row) => (
                    <tr key={row.subject}>
                      <td>{row.subject}</td>
                      <td>{row.attended} / {row.total}</td>
                      <td>{row.percentage}%</td>
                      <td>
                        <Link
                          className="btn btn--secondary"
                          to={`/attendance-list?subject=${encodeURIComponent(row.subject)}`}
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4">No subject-wise attendance data found.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}