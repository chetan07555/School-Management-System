import { NavLink, useNavigate } from 'react-router-dom';
import { FaBell, FaBookOpen, FaCalendarAlt, FaChalkboardTeacher, FaFileAlt, FaHome, FaStickyNote, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa';
import { clearAuth } from '../utils/auth';
import { getStoredUser } from '../utils/auth';

const linkClass = ({ isActive }) => (isActive ? 'side-link side-link--active' : 'side-link');

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
  { to: '/attendance', label: 'Attendance', icon: FaCalendarAlt },
  { to: '/marks', label: 'Marks', icon: FaBookOpen },
  { to: '/notes', label: 'Notes', icon: FaStickyNote },
  { to: '/timetable', label: 'Timetable', icon: FaFileAlt },
  { to: '/notifications', label: 'Notifications', icon: FaBell },
  { to: '/report', label: 'Report', icon: FaHome, studentOnly: true },
  { to: '/classes', label: 'Classes', icon: FaChalkboardTeacher, teacherOnly: true }
];

export default function Sidebar() {
  const user = getStoredUser();
  const isTeacher = user?.role === 'teacher';
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img
          className="sidebar__logo"
          src="https://img.freepik.com/premium-vector/school-logo-vector-design-with-white-background_579306-14620.jpg"
          alt="School logo"
        />
        <div>
          <div className="sidebar__title">BrightFuture School</div>
          <div className="sidebar__subtitle">{user?.role || 'visitor'}</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map((item) => {
          if (item.teacherOnly && !isTeacher) return null;
          if (item.studentOnly && isTeacher) return null;

          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <Icon className="side-link__icon" aria-hidden="true" />
              <span className="side-link__label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <section className="sidebar__settings">
        <div className="sidebar__settings-title">Extra Settings</div>
        <button type="button" className="btn btn--ghost sidebar__logout" onClick={logout}>
          <FaSignOutAlt className="sidebar__logout-icon" aria-hidden="true" />
          <span className="sidebar__label">Logout</span>
        </button>
      </section>
    </aside>
  );
}