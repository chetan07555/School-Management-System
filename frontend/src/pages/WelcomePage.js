import { Link } from 'react-router-dom';

export default function WelcomePage() {
  const schoolImageUrl =
    'https://npr.brightspotcdn.com/dims4/default/c3dd473/2147483647/strip/true/crop/2256x1496+0+0/resize/880x584!/quality/90/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Flegacy%2Fsites%2Fwkms%2Ffiles%2F201709%2FHendersonCountyHS.jpg';
  const libraryImageUrl =
    'https://media.istockphoto.com/id/1193273154/photo/empty-wooden-tables-in-public-library.jpg?s=612x612&w=0&k=20&c=XdP9LgQCNgJxu9pBBfj5mK4dTlYHA7nbi_lGJY37i84=';

  const modules = [
    {
      title: 'Attendance',
      description: 'Mark and review attendance with class-based filtering.',
    },
    {
      title: 'Marks',
      description: 'Upload test scores and compare progress by subject.',
    },
    {
      title: 'Notes',
      description: 'Share PDFs, DOCs, and presentations with your class.',
    },
    {
      title: 'Timetable',
      description: 'Publish class schedules with quick updates for everyone.',
    },
    {
      title: 'Notifications',
      description: 'Send important school updates to staff, students, and parents.',
    },
    {
      title: 'Reports',
      description: 'Generate academic summaries and attendance insights in seconds.',
    },
  ];

  return (
    <div className="welcome-page">
      <section className="welcome-hero">
        <div className="welcome-media-row">
          <div className="welcome-media-content">
            <div className="welcome-badge">BrightFuture Public School</div>
            <h1>School management built for students, teachers, and parents.</h1>
            <p>
              Track attendance, upload notes, manage marks, publish timetables,
              and keep everyone connected from one clean dashboard.
            </p>
            <div className="welcome-actions">
              <Link to="/login" className="btn btn--primary">Login</Link>
              <Link to="/register" className="btn btn--secondary">Create Account</Link>
            </div>
          </div>
          <div className="welcome-media-visual welcome-school-image">
            <img src={schoolImageUrl} alt="Brigthfuture school campus" />
            <p className="welcome-school-name">Brigthfuture</p>
          </div>
        </div>
      </section>

      <section className="welcome-section">
        <div className="welcome-media-row">
          <div className="welcome-media-visual welcome-library-image">
            <img src={libraryImageUrl} alt="School library study area" />
          </div>
          <div className="welcome-media-content">
            <h2 className="welcome-section-title">Learning Space</h2>
            <p className="welcome-section-subtitle">
              A focused environment helps students build consistency and confidence.
            </p>
            <blockquote className="welcome-quote">
              "Success is the sum of small efforts, repeated day in and day out."
            </blockquote>
          </div>
        </div>
      </section>

      <section className="welcome-section">
        <h2 className="welcome-section-title">Everything in one platform</h2>
        <p className="welcome-section-subtitle">
          Add more components anytime. This layout keeps each section separated,
          readable, and easy to expand.
        </p>
        <div className="welcome-grid welcome-grid--modules">
          {modules.map((module) => (
            <article className="info-card" key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="welcome-section welcome-section--cta panel">
        <h2>Ready to get started with Brigthfuture?</h2>
        <p>
          Create your account and begin managing attendance, marks, notes, and
          communication from a single place.
        </p>
        <div className="welcome-actions">
          <Link to="/register" className="btn btn--primary">Get Started</Link>
          <Link to="/login" className="btn btn--secondary">Sign In</Link>
        </div>
      </section>
    </div>
  );
}