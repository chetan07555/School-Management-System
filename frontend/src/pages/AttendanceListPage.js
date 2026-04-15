import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

export default function AttendanceListPage() {
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const subjectFromQuery = queryParams.get('subject') || '';

  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const [classes, setClasses] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  const classNames = useMemo(
    () => [...new Set(classes.map((item) => item.className).filter(Boolean))],
    [classes]
  );

  const subjectsForSelectedClass = useMemo(
    () => Array.from(new Set(classes.filter((item) => item.className === selectedClassName).map((item) => item.subject))).sort((a, b) => a.localeCompare(b)),
    [classes, selectedClassName]
  );

  useEffect(() => {
    if (!isTeacher) return;

    const loadClasses = async () => {
      try {
        const response = await API.get('/classes');
        const items = response.data || [];
        setClasses(items);
        setSelectedClassName((prev) => prev || items[0]?.className || '');
        setSelectedSubject((prev) => prev || items[0]?.subject || '');
      } catch {
        setError('Unable to load classes');
      }
    };

    loadClasses();
  }, [isTeacher]);

  useEffect(() => {
    if (!isStudent || !subjectFromQuery) return;
    setSelectedSubject(subjectFromQuery);
  }, [isStudent, subjectFromQuery]);

  useEffect(() => {
    if (!isTeacher) return;

    if (!classNames.length) {
      setSelectedClassName('');
      setSelectedSubject('');
      return;
    }

    if (!classNames.includes(selectedClassName)) {
      setSelectedClassName(classNames[0]);
      return;
    }

    if (!subjectsForSelectedClass.length) {
      setSelectedSubject('');
      return;
    }

    if (!subjectsForSelectedClass.includes(selectedSubject)) {
      setSelectedSubject(subjectsForSelectedClass[0]);
    }
  }, [isTeacher, classNames, selectedClassName, subjectsForSelectedClass, selectedSubject]);

  useEffect(() => {
    const loadData = async () => {
      if (isTeacher) {
        if (!selectedClassName) return;

        try {
          const [attendanceResponse, studentsResponse] = await Promise.all([
            API.get('/attendance', { params: { className: selectedClassName, date: selectedDate } }),
            API.get('/classes/students', { params: { className: selectedClassName } })
          ]);

          setRecords(attendanceResponse.data?.records || []);
          setRoster(studentsResponse.data || []);
          setError('');
        } catch {
          setError('Unable to load attendance list');
          setRecords([]);
          setRoster([]);
        }

        return;
      }

      if (isStudent) {
        try {
          const response = await API.get('/attendance');
          const items = response.data?.records || [];
          setRecords(items);
          setError('');
        } catch {
          setError('Unable to load attendance list');
          setRecords([]);
        }
      }
    };

    loadData();
  }, [isTeacher, isStudent, selectedClassName, selectedDate]);

  const studentDateWiseList = useMemo(() => {
    if (!isStudent) return [];

    const filtered = selectedSubject
      ? records.filter((row) => String(row.subject || '').toLowerCase() === selectedSubject.toLowerCase())
      : records;

    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [isStudent, records, selectedSubject]);

  const studentPresentCount = useMemo(
    () => studentDateWiseList.filter((row) => row.status === 'Present').length,
    [studentDateWiseList]
  );

  const studentTotalCount = studentDateWiseList.length;

  const studentAttendancePct = studentTotalCount
    ? Number(((studentPresentCount / studentTotalCount) * 100).toFixed(2))
    : 0;

  const studentAttendanceList = useMemo(() => {
    const statusByStudent = new Map(records.map((record) => [String(record.studentId), record.status]));

    return [...roster]
      .map((student) => ({
        id: student._id,
        name: student.name,
        status: statusByStudent.get(String(student._id)) || 'Absent'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, roster]);

  const presentCount = useMemo(
    () => studentAttendanceList.filter((item) => item.status === 'Present').length,
    [studentAttendanceList]
  );

  const absentCount = useMemo(
    () => studentAttendanceList.filter((item) => item.status === 'Absent').length,
    [studentAttendanceList]
  );

  if (!isTeacher && !isStudent) {
    return (
      <PageShell title="Attendance List" subtitle="Teacher-only attendance analytics.">
        <section className="panel">
          <p>This page is available to teachers and students only.</p>
          <Link className="btn btn--secondary" to="/attendance">Back to attendance</Link>
        </section>
      </PageShell>
    );
  }

  if (isStudent) {
    return (
      <PageShell
        title="Attendance Details"
        subtitle="Date-wise attendance list for the selected subject."
        actions={[
          <Link key="attendance" className="btn btn--secondary" to="/attendance">Back to attendance</Link>
        ]}
      >
        {error ? <div className="alert alert--error">{error}</div> : null}

        <section className="panel">
          <h2>Selected subject</h2>
          <input
            className="input input--short"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            placeholder="Subject"
          />
        </section>

        <section className="panel">
          <h2>Summary</h2>
          <div className="stats-grid">
            <article className="stat-card"><span>Present</span><strong>{studentPresentCount}</strong></article>
            <article className="stat-card"><span>Total</span><strong>{studentTotalCount}</strong></article>
            <article className="stat-card"><span>Attendance</span><strong>{studentAttendancePct}%</strong></article>
          </div>
        </section>

        <section className="panel">
          <h2>Date-wise list</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {studentDateWiseList.length ? studentDateWiseList.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td>{item.className || '-'}</td>
                    <td>{item.subject || '-'}</td>
                    <td>{item.status}</td>
                  </tr>
                )) : <tr><td colSpan="4">No attendance records found for this subject.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Attendance List"
      subtitle="Date-wise attendance list for the selected class and subject."
      actions={[
        <Link key="attendance" className="btn btn--secondary" to="/attendance">Back to attendance</Link>,
        <Link key="marks" className="btn btn--secondary" to="/marks-list">View marks list</Link>
      ]}
    >
      {error ? <div className="alert alert--error">{error}</div> : null}

      <section className="panel">
        <h2>Select class, subject and date</h2>
        <div className="form-grid form-grid--4">
          <select className="input" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
            {classNames.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
            {subjectsForSelectedClass.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </section>

      <section className="panel">
        <h2>Summary</h2>
        <div className="stats-grid">
          <article className="stat-card"><span>Present</span><strong>{presentCount}</strong></article>
          <article className="stat-card"><span>Absent</span><strong>{absentCount}</strong></article>
          <article className="stat-card"><span>Date</span><strong>{selectedDate || '-'}</strong></article>
        </div>
      </section>

      <section className="panel">
        <h2>Student wise attendance list (date-wise)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {studentAttendanceList.length ? studentAttendanceList.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{selectedSubject || '-'}</td>
                  <td>{selectedDate || '-'}</td>
                  <td>{student.status}</td>
                </tr>
              )) : <tr><td colSpan="4">No attendance data found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}