import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { normalizeTheme } from './lib/themes';

function getPersistedTheme() {
  try {
    const raw = localStorage.getItem('biblia-mapa-v1');
    if (!raw) return 'mesh-dark';
    const parsed = JSON.parse(raw);
    return normalizeTheme(parsed?.state?.settings?.theme);
  } catch {
    return 'mesh-dark';
  }
}

document.documentElement.setAttribute('data-theme', getPersistedTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
