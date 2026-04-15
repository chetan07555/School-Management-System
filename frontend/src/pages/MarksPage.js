import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

const percent = (obtained, total) => (total ? Number(((obtained / total) * 100).toFixed(2)) : 0);

export default function MarksPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [marks, setMarks] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [rosterMarks, setRosterMarks] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  const classNames = useMemo(
    () => [...new Set(classes.map((item) => item.className).filter(Boolean))],
    [classes]
  );

  const subjectsForSelectedClass = useMemo(
    () => classes.filter((item) => item.className === selectedClassName).map((item) => item.subject),
    [classes, selectedClassName]
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item.className === selectedClassName && item.subject === selectedSubject) || null,
    [classes, selectedClassName, selectedSubject]
  );

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

    if (!classNames.includes(selectedClassName)) {
      setSelectedClassName(classNames[0] || '');
    }

    const subjects = classes
      .filter((item) => item.className === (classNames.includes(selectedClassName) ? selectedClassName : classNames[0]))
      .map((item) => item.subject);

    if (!subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0] || '');
    }
  }, [isTeacher, classes, classNames, selectedClassName, selectedSubject]);

  useEffect(() => {
    const load = async () => {
      try {
        const params = isTeacher && selectedClass ? { className: selectedClass.className, subject: selectedClass.subject } : {};
        const response = isTeacher ? await API.get('/marks', { params }) : await API.get('/marks/comparison');
        if (isTeacher) {
          setMarks(response.data || []);
        } else {
          setComparison(response.data || null);
          setMarks(response.data?.records || []);
        }
      } catch {
        setError('Unable to load marks');
      }
    };
    load();
  }, [isTeacher, selectedClass]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!isTeacher || !selectedClass) return;
      try {
        const response = await API.get('/classes/students', { params: { className: selectedClass.className } });
        const items = response.data || [];
        setRosterMarks(items.map((student) => ({ studentId: student._id, name: student.name, marksObtained: '' })));
      } catch {
        setRosterMarks([]);
      }
    };
    loadStudents();
  }, [isTeacher, selectedClass]);

  const uploadMarks = async () => {
    try {
      setError('');
      const total = Number(totalMarks);
      await API.post('/marks/upload', {
        className: selectedClass.className,
        subject: selectedClass.subject,
        testName,
        totalMarks: total,
        marks: rosterMarks.filter((row) => row.marksObtained !== '').map((row) => ({ studentId: row.studentId, marksObtained: Number(row.marksObtained) })),
      });
      const response = await API.get('/marks', { params: { className: selectedClass.className, subject: selectedClass.subject } });
      setMarks(response.data || []);
      setToast('Marks uploaded successfully');
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to upload marks');
    }
  };

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
  }, []);

  const classAverage = useMemo(() => {
    if (!marks.length) return 0;
    return Number((marks.reduce((sum, item) => sum + percent(item.marksObtained, item.totalMarks), 0) / marks.length).toFixed(2));
  }, [marks]);

  return (
    <PageShell title="Marks" subtitle="Manage test results and compare performance.">
      {error ? <div className="alert alert--error">{error}</div> : null}
      {toast ? <div className="toast toast--success">{toast}</div> : null}

      {isTeacher ? (
        <>
          <section className="panel">
            <h2>Upload marks</h2>
            <div className="form-grid form-grid--4">
              <select className="input" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
                {classNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                {subjectsForSelectedClass.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Test name" />
              <input className="input" type="number" min="1" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="Total marks" />
            </div>
            <div className="table-wrap mt-3">
              <table className="table">
                <thead><tr><th>Student</th><th>Marks obtained</th></tr></thead>
                <tbody>
                  {rosterMarks.map((row) => (
                    <tr key={row.studentId}>
                      <td>{row.name}</td>
                      <td><input className="input input--inline" type="number" min="0" value={row.marksObtained} onChange={(e) => setRosterMarks((prev) => prev.map((item) => item.studentId === row.studentId ? { ...item, marksObtained: e.target.value } : item))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn--primary mt-3" type="button" onClick={uploadMarks}>Save marks</button>
          </section>

          <section className="panel">
            <h2>Summary</h2>
            <div className="stats-grid">
              <article className="stat-card"><span>Average</span><strong>{classAverage}%</strong></article>
              <article className="stat-card"><span>Records</span><strong>{marks.length}</strong></article>
            </div>
          </section>

          <section className="panel">
            <h2>View student wise marks list</h2>
            <Link className="btn btn--secondary" to="/marks-list">View marks list</Link>
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <h2>Your comparison</h2>
            <div className="stats-grid">
              <article className="stat-card"><span>Your average</span><strong>{comparison?.yourAverage || 0}%</strong></article>
              <article className="stat-card"><span>Class average</span><strong>{comparison?.classAverage || 0}%</strong></article>
            </div>
          </section>

          <section className="panel">
            <h2>Results</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Subject</th><th>Test</th><th>Score</th><th>%</th></tr></thead>
                <tbody>
                  {marks.length ? marks.map((item) => (
                    <tr key={item._id}><td>{item.subject}</td><td>{item.testName}</td><td>{item.marksObtained}/{item.totalMarks}</td><td>{percent(item.marksObtained, item.totalMarks)}%</td></tr>
                  )) : <tr><td colSpan="4">No marks yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}