import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

const percent = (obtained, total) => (total ? Number(((obtained / total) * 100).toFixed(2)) : 0);

export default function MarksListPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

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
    const loadClasses = async () => {
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

    loadClasses();
  }, []);

  useEffect(() => {
    if (!isTeacher) return;

    if (!classNames.includes(selectedClassName)) {
      setSelectedClassName(classNames[0] || '');
    }

    const activeClassName = classNames.includes(selectedClassName) ? selectedClassName : classNames[0];
    const subjects = classes
      .filter((item) => item.className === activeClassName)
      .map((item) => item.subject);

    if (!subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0] || '');
    }
  }, [isTeacher, classes, classNames, selectedClassName, selectedSubject]);

  useEffect(() => {
    const loadData = async () => {
      if (!isTeacher || !selectedClass) return;

      try {
        const [marksResponse, studentsResponse] = await Promise.all([
          API.get('/marks', { params: { className: selectedClass.className, subject: selectedClass.subject } }),
          API.get('/classes/students', { params: { className: selectedClass.className } })
        ]);

        setRecords(marksResponse.data || []);
        setRoster(studentsResponse.data || []);
      } catch {
        setRecords([]);
        setRoster([]);
      }
    };

    loadData();
  }, [isTeacher, selectedClass]);

  const studentNameById = useMemo(
    () => new Map(roster.map((student) => [String(student._id), student.name])),
    [roster]
  );

  if (!isTeacher) {
    return (
      <PageShell title="Marks List" subtitle="Teacher-only marks analytics.">
        <section className="panel">
          <p>This page is available to teachers only.</p>
          <Link className="btn btn--secondary" to="/marks">Back to marks</Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Marks List"
      subtitle="Student-wise marks for the selected class and subject."
      actions={[
        <Link key="marks" className="btn btn--secondary" to="/marks">Back to marks</Link>,
        <Link key="attendance" className="btn btn--secondary" to="/attendance-list">View attendance list</Link>
      ]}
    >
      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="panel">
        <h2>Select class and subject</h2>
        <div className="form-grid form-grid--2">
          <select className="input" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
            {classNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            {subjectsForSelectedClass.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel">
        <h2>Student wise marks list</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Test</th>
                <th>Marks</th>
                <th>%</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? records.map((item) => (
                <tr key={item._id}>
                  <td>{studentNameById.get(String(item.studentId)) || 'Unknown student'}</td>
                  <td>{item.testName}</td>
                  <td>{item.marksObtained}/{item.totalMarks}</td>
                  <td>{percent(item.marksObtained, item.totalMarks)}%</td>
                  <td>
                    <Link
                      className="btn btn--secondary"
                      to={`/marks/${item._id}/edit`}
                      state={{ mark: item, studentName: studentNameById.get(String(item.studentId)) || '' }}
                    >
                      Update marks
                    </Link>
                  </td>
                </tr>
              )) : <tr><td colSpan="5">No marks records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}