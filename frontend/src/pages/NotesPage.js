import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';
import { toWebFileUrl } from '../utils/fileUrl';

const SUBJECTS = ['English', 'Physics', 'Chemistry', 'Maths', 'Biology', 'Kannada'];

export default function NotesPage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const selectedClassRecord = useMemo(
    () => classes.find((item) => item._id === selectedClassId) || classes[0] || null,
    [classes, selectedClassId]
  );

  useEffect(() => {
    if (!selectedSubject && selectedClassRecord?.subject) {
      setSelectedSubject(selectedClassRecord.subject);
    }
  }, [selectedClassRecord, selectedSubject]);

  useEffect(() => {
    const load = async () => {
      try {
        const classResponse = await API.get('/classes');
        const classItems = classResponse.data || [];
        setClasses(classItems);
        setSelectedClassId((prev) => prev || classItems[0]?._id || '');
        setSelectedSubject((prev) => prev || classItems[0]?.subject || '');

        const notesResponse = isTeacher ? await API.get('/notes') : await API.get('/notes', { params: { class: user?.class } });
        setNotes(notesResponse.data || []);
      } catch {
        setError('Unable to load notes');
      }
    };

    load();
  }, [isTeacher, user?.class]);

  const filteredNotes = useMemo(() => {
    let items = [...notes];
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      items = items.filter((item) => [item.title, item.description, item.subject, item.class].some((value) => String(value || '').toLowerCase().includes(query)));
    }
    if (subjectFilter !== 'all') items = items.filter((item) => item.subject === subjectFilter);
    if (classFilter !== 'all') items = items.filter((item) => item.class === classFilter);
    return items;
  }, [notes, searchQuery, subjectFilter, classFilter]);

  const applySearch = () => {
    setSearchQuery(searchInput);
  };

  const upload = async () => {
    try {
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subject', selectedSubject || '');
      formData.append('class', selectedClassRecord?.className || '');
      await API.post('/notes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const response = await API.get('/notes');
      setNotes(response.data || []);
      setFile(null);
      setTitle('');
      setDescription('');
      setSelectedSubject(selectedClassRecord?.subject || '');
      setToast('Note uploaded successfully');
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to upload note');
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((item) => item._id !== id));
      setToast('Note deleted successfully');
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to delete note');
    }
  };

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <PageShell title="Notes" subtitle="Upload and access class materials.">
      {error ? <div className="alert alert--error">{error}</div> : null}
      {toast ? <div className="toast toast--success">{toast}</div> : null}

      {isTeacher ? (
        <section className="panel">
          <h2>Upload note</h2>
          <div className="notes-form">
            <div className="form-grid form-grid--2 notes-form__grid">
              <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                {classes.map((item) => <option key={item._id} value={item._id}>{item.className}</option>)}
              </select>
              <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">Select subject</option>
                {SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="notes-form__file-row">
              <input ref={fileInputRef} className="input" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <button className="btn btn--primary notes-form__submit" type="button" onClick={upload}>Upload note</button>
          </div>

          <div className="table-wrap mt-4">
            <table className="table">
              <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>File</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredNotes.map((item) => (
                  <tr key={item._id}>
                    <td>{item.title}</td>
                    <td>{item.class}</td>
                    <td>{item.subject}</td>
                    <td><a href={`http://localhost:5000/${toWebFileUrl(item.fileUrl)}`} target="_blank" rel="noreferrer">Open</a></td>
                    <td><button className="btn btn--ghost" type="button" onClick={() => remove(item._id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>My notes</h2>
          <div className="notes-filters">
            <div className="filter-row">
              <select className="input input--short" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">All subjects</option>
                {SUBJECTS.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select className="input input--short" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="all">All classes</option>
                {classes.map((item) => <option key={item._id} value={item.className}>{item.className}</option>)}
              </select>
            </div>
            <div className="notes-search">
              <input
                className="input notes-search__input"
                placeholder="Search notes"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applySearch();
                  }
                }}
              />
              <button className="btn btn--primary notes-search__button" type="button" onClick={applySearch}>
                Search
              </button>
            </div>
          </div>
          <div className="card-grid mt-4">
            {filteredNotes.map((item) => (
              <article className="info-card" key={item._id}>
                <h3>{item.title}</h3>
                <p>{item.subject} • {item.class}</p>
                <p>{item.description || 'No description'}</p>
                <a href={`http://localhost:5000/${toWebFileUrl(item.fileUrl)}`} target="_blank" rel="noreferrer">Download</a>
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}