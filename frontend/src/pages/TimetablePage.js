import { useEffect, useState } from 'react';
import API from '../services/api';
import PageShell from '../components/PageShell';
import { getStoredUser } from '../utils/auth';
import { toWebFileUrl } from '../utils/fileUrl';

export default function TimetablePage() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [file, setFile] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState('');
  const classNames = [...new Set(classes.map((item) => item.className).filter(Boolean))];
  const selectedFileLabel = file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)` : 'No file selected';

  useEffect(() => {
    const load = async () => {
      try {
        const classResponse = await API.get('/classes');
        const items = classResponse.data || [];
        setClasses(items);
        const uniqueClassNames = [...new Set(items.map((item) => item.className).filter(Boolean))];
        setSelectedClass((prev) => prev || uniqueClassNames[0] || '');

        const className = isTeacher ? items[0]?.className : user?.class;
        if (className) {
          const timetableResponse = await API.get('/timetable/by-class', { params: { class: className } });
          setTimetable(timetableResponse.data || null);
        }
      } catch {
        setTimetable(null);
      }
    };

    load();
  }, [isTeacher, user?.class]);

  const upload = async () => {
    try {
      setError('');
      if (!selectedClass) {
        setError('Please select a class');
        return;
      }

      if (!file) {
        setError('Please choose a timetable file first');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('class', selectedClass);
      const response = await API.post('/timetable/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTimetable(response.data || null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Unable to upload timetable');
    }
  };

  return (
    <PageShell title="Timetable" subtitle="Upload and view the class timetable.">
      {error ? <div className="alert alert--error">{error}</div> : null}

      {isTeacher ? (
        <section className="panel">
          <h2>Upload timetable</h2>
          <div className="form-grid form-grid--3">
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              {classNames.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>

            <div className="file-picker">
              <label className="btn btn--secondary file-picker__trigger" htmlFor="timetable-file-input">Choose file</label>
              <input
                id="timetable-file-input"
                className="file-picker__input"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="file-picker__meta">{selectedFileLabel}</p>
              <p className="file-picker__hint">Accepted: Images, PDF</p>
            </div>

            <button className="btn btn--primary" type="button" onClick={upload} disabled={!selectedClass || !file}>Upload</button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2>Current timetable</h2>
        {timetable?.fileUrl ? (
          toWebFileUrl(timetable.fileUrl).toLowerCase().endsWith('.pdf') ? (
            <iframe title="Timetable" className="pdf-frame" src={`http://localhost:5000/${toWebFileUrl(timetable.fileUrl)}`} />
          ) : (
            <img className="timetable-image" src={`http://localhost:5000/${toWebFileUrl(timetable.fileUrl)}`} alt="Timetable" />
          )
        ) : (
          <p>No timetable uploaded yet.</p>
        )}
      </section>
    </PageShell>
  );
}