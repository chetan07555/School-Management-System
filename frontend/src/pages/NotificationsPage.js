import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

const socket = io('http://localhost:5000');

export default function NotificationsPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const classOptions = useMemo(
    () => Array.from(new Set(classes.map((item) => item.className).filter(Boolean))),
    [classes]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [notificationResponse, classResponse] = await Promise.all([
          API.get('/notifications'),
          isTeacher ? API.get('/classes') : Promise.resolve({ data: [] })
        ]);
        if (!active) return;
        const items = notificationResponse.data || [];
        setNotifications(items);
        if (isTeacher) {
          const classItems = classResponse.data || [];
          setClasses(classItems);
          setSelectedClassName((prev) => prev || classItems[0]?.className || '');
        }
        if (items.some((item) => !item.read)) {
          await API.patch('/notifications/read');
          if (!active) return;
          setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
        }
      } catch {
        if (active) setNotifications([]);
      }
    };

    load();
    const refresh = () => load();
    socket.on('new_notification', refresh);

    return () => {
      active = false;
      socket.off('new_notification', refresh);
    };
  }, [isTeacher]);

  const sendNotice = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setStatus('');
      await API.post('/notifications/notice', {
        className: selectedClassName,
        message: noticeText
      });
      setNoticeText('');
      setStatus('Notice sent to students');
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to send notice');
    }
  };

  return (
    <PageShell title="Notice Board" subtitle={`Unread notices: ${unreadCount}`}>
      {error ? <div className="alert alert--error">{error}</div> : null}
      {status ? <div className="toast toast--success">{status}</div> : null}

      {isTeacher ? (
        <section className="panel">
          <h2>Post a notice</h2>
          <form className="form-grid" onSubmit={sendNotice}>
            <select className="input" value={selectedClassName} onChange={(e) => setSelectedClassName(e.target.value)}>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <textarea
              className="input"
              rows="4"
              placeholder="Write a notice for the students..."
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
            />
            <button className="btn btn--primary" type="submit" disabled={!noticeText.trim()}>
              Send notice
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="page-hero__actions" style={{ marginBottom: '16px' }}>
          <Link className="btn btn--secondary" to="/dashboard">Dashboard</Link>
          <Link className="btn btn--secondary" to="/attendance">Attendance</Link>
          <Link className="btn btn--secondary" to="/marks">Marks</Link>
        </div>

        <div className="card-grid">
          {notifications.map((item) => (
            <article className={`info-card ${item.read ? '' : 'info-card--highlight'}`} key={item._id}>
              <h3>Notice</h3>
              <p>{item.message}</p>
              <p>{new Date(item.createdAt).toLocaleString()}</p>
              {!item.read ? <span className="pill">New</span> : null}
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}