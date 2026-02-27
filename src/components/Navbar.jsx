import { NavLink } from 'react-router-dom';
import { usePlayer } from '../App.jsx';

function Navbar() {
  const { theme, toggleTheme } = usePlayer();

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="28" height="28" rx="8" fill="url(#grad)" />
          <path d="M9 11.5C9 9.567 10.567 8 12.5 8h3C17.433 8 19 9.567 19 11.5v2C19 15.433 17.433 17 15.5 17h-3C10.567 17 9 15.433 9 13.5v-2Z" fill="white" fillOpacity="0.9" />
          <path d="M12 17v2.5a1.5 1.5 0 003 0V17" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" strokeLinecap="round" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
              <stop stopColor="#7c5cfc" />
              <stop offset="1" stopColor="#00d4aa" />
            </linearGradient>
          </defs>
        </svg>
        <h1>PodCut</h1>
      </NavLink>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L17 17" />
          </svg>
          Discover
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4.5l1.5 3 3.5.5-2.5 2.5.5 3.5L10 12.5l-3 1.5.5-3.5-2.5-2.5 3.5-.5L10 4.5z" />
          </svg>
          Favorites
        </NavLink>
        <button className="nav-link theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="4" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 11.5A7.5 7.5 0 118.5 3a5.5 5.5 0 008.5 8.5z" />
            </svg>
          )}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

