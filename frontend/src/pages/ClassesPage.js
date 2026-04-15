import { useEffect, useState } from 'react';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';

export default function ClassesPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [form, setForm] = useState({ className: '', subject: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await API.get('/classes');
        setClasses(response.data || []);
        const firstClass = response.data?.[0]?.className || '';
        setSelectedClass((prev) => prev || firstClass);
      } catch {
        setError('Unable to load classes');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      if (!isTeacher || !selectedClass) return;
      try {
        const response = await API.get('/classes/students', { params: { className: selectedClass } });
        setStudents(response.data || []);
      } catch {
        setStudents([]);
      }
    };
    loadStudents();
  }, [isTeacher, selectedClass]);

  const createClass = async (event) => {
    event.preventDefault();
    try {
      setError('');
      await API.post('/classes', form);
      setForm({ className: '', subject: '' });
      const response = await API.get('/classes');
      setClasses(response.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to create class');
    }
  };

  return (
    <PageShell title="Classes" subtitle="Manage class and subject assignments.">
      {error ? <div className="alert alert--error">{error}</div> : null}

      {isTeacher ? (
        <>
          <section className="panel">
            <h2>Create class</h2>
            <form className="form-grid" onSubmit={createClass}>
              <input className="input" placeholder="Class name" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
              <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <button className="btn btn--primary" type="submit">Save class</button>
            </form>
          </section>

          <section className="panel">
            <h2>My classes</h2>
            <div className="card-grid">
              {classes.map((item) => (
                <article className="info-card" key={item._id}>
                  <h3>{item.className}</h3>
                  <p>{item.subject}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Class students</h2>
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {classes.map((item) => <option key={item._id} value={item.className}>{item.className} - {item.subject}</option>)}
            </select>
            <div className="card-grid mt-3">
              {students.map((student) => (
                <article className="info-card" key={student._id}>
                  <h3>{student.name}</h3>
                  <p>{student.email}</p>
                  <span className="pill">{student.class}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel">
          <h2>Your classes</h2>
          <div className="card-grid">
            {classes.map((item) => (
              <article className="info-card" key={item._id}>
                <h3>{item.className}</h3>
                <p>{item.subject}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}