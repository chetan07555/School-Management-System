import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

const Stat = ({ label, value, hint }) => (
  <article className="stat-card">
    <span>{label}</span>
    <strong>{value}</strong>
    {hint ? <small>{hint}</small> : null}
  </article>
);

export default function DashboardPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [summary, setSummary] = useState({ classes: 0, students: 0, notes: 0, attendance: 0, marks: 0 });
  const [comparison, setComparison] = useState({ yourAverage: 0, classAverage: 0, yourAttendance: 0, classAttendance: 0 });
  const [recentMarks, setRecentMarks] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [teacherActivity, setTeacherActivity] = useState({ notes: [], marks: [], attendance: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setError('');
        if (isTeacher) {
          const [classesRes, notesRes, attendanceRes, marksRes] = await Promise.all([
            API.get('/classes'),
            API.get('/notes'),
            API.get('/attendance'),
            API.get('/marks'),
          ]);

          if (!active) return;
          setSummary({
            classes: classesRes.data.length,
            students: 0,
            notes: notesRes.data.length,
            attendance: attendanceRes.data.records?.length || 0,
            marks: marksRes.data.length,
          });
          setTeacherActivity({
            notes: [...(notesRes.data || [])],
            marks: [...(marksRes.data || [])],
            attendance: [...(attendanceRes.data.records || [])],
          });
        } else {
          const [attendanceRes, marksRes, notificationsRes] = await Promise.all([
            API.get('/attendance'),
            API.get('/marks/comparison'),
            API.get('/notifications')
          ]);

          if (!active) return;
          setComparison({
            yourAverage: marksRes.data.yourAverage || 0,
            classAverage: marksRes.data.classAverage || 0,
            yourAttendance: attendanceRes.data.comparison?.yourAttendance || 0,
            classAttendance: attendanceRes.data.comparison?.classAverage || 0,
          });
          setRecentMarks((marksRes.data.records || []).slice(0, 6));
          const notifications = notificationsRes.data || [];
          setRecentNotifications(
            [...notifications]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
          );
        }
      } catch {
        if (active) setError('Unable to load dashboard data');
      }
    };

    load();
    return () => { active = false; };
  }, [isTeacher]);

  const quickLinks = useMemo(() => ([
    { to: '/attendance', label: 'Attendance' },
    { to: '/marks', label: 'Marks' },
    { to: '/notes', label: 'Notes' },
    { to: '/timetable', label: 'Timetable' },
  ]), []);

  const recentTeacherUpdates = useMemo(() => {
    if (!isTeacher) return [];

    const noteItems = (teacherActivity.notes || []).map((item) => ({
      id: item._id,
      type: 'Note',
      title: item.title || 'Untitled note',
      details: `${item.class || 'Unknown class'} • ${item.subject || 'Unknown subject'}`,
      time: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      meta: item.description || 'Note uploaded'
    }));

    const markItems = (teacherActivity.marks || []).map((item) => ({
      id: item._id,
      type: 'Marks',
      title: item.testName || 'Test marks',
      details: `${item.className || 'Unknown class'} • ${item.subject || 'Unknown subject'}`,
      time: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      meta: item.totalMarks ? `${item.marksObtained}/${item.totalMarks} marks` : 'Marks uploaded'
    }));

    const attendanceItems = (teacherActivity.attendance || []).map((item) => ({
      id: item._id,
      type: 'Attendance',
      title: item.date ? new Date(item.date).toLocaleDateString() : 'Attendance update',
      details: `${item.className || 'Unknown class'} • ${item.subject || 'Unknown subject'}`,
      time: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      meta: item.status ? `Marked ${item.status}` : 'Attendance marked'
    }));

    return [...noteItems, ...markItems, ...attendanceItems]
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);
  }, [isTeacher, teacherActivity]);

  return (
    <PageShell
      title={`Welcome, ${user?.name || 'User'}`}
      subtitle={isTeacher ? 'Manage classes and academic activity from one place.' : 'See your academic progress and updates.'}
    >
      {error ? <div className="alert alert--error">{error}</div> : null}

      {isTeacher ? (
        <>
          <div className="stats-grid">
            <Stat label="Classes" value={summary.classes} />
            <Stat label="Notes" value={summary.notes} />
            <Stat label="Attendance Records" value={summary.attendance} />
            <Stat label="Marks Records" value={summary.marks} />
          </div>

          <section className="panel">
            <h2>Quick Actions</h2>
            <div className="chip-row">
              {quickLinks.map((item) => <Link key={item.to} className="chip" to={item.to}>{item.label}</Link>)}
            </div>
          </section>

          <section className="panel">
            <h2>Recent Updates</h2>
            <p className="dashboard-recent-updates__subtitle">
              Latest notes, marks, and attendance updates created by you.
            </p>
            <div className="card-grid dashboard-recent-updates__grid">
              {recentTeacherUpdates.length ? recentTeacherUpdates.map((item) => (
                <article key={`${item.type}-${item.id}`} className="info-card info-card--highlight">
                  <p className="eyebrow">{item.type}</p>
                  <h3>{item.title}</h3>
                  <p>{item.details}</p>
                  <p>{item.meta}</p>
                </article>
              )) : <p>No recent updates yet.</p>}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="stats-grid">
            <Stat label="Attendance" value={`${comparison.yourAttendance}%`} hint={`Class average: ${comparison.classAttendance}%`} />
            <Stat label="Marks" value={`${comparison.yourAverage}%`} hint={`Class average: ${comparison.classAverage}%`} />
          </div>

          <section className="panel">
            <h2>Recent Marks</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Subject</th><th>Test</th><th>Score</th></tr></thead>
                <tbody>
                  {recentMarks.length ? recentMarks.map((item) => (
                    <tr key={item._id}><td>{item.subject}</td><td>{item.testName}</td><td>{item.marksObtained}/{item.totalMarks}</td></tr>
                  )) : <tr><td colSpan="3">No marks yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Recent Notifications</h2>
            <div className="card-grid">
              {recentNotifications.length ? recentNotifications.map((item) => (
                <article key={item._id} className={`info-card ${item.read ? '' : 'info-card--highlight'}`}>
                  <h3>{item.read ? 'Notification' : 'New Notification'}</h3>
                  <p>{item.message}</p>
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                </article>
              )) : <p>No notifications yet.</p>}
            </div>
            <div className="chip-row" style={{ marginTop: '12px' }}>
              <Link className="chip" to="/notifications">View all notifications</Link>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}