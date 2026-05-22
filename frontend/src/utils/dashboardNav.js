import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function getActivePanelFromLocation(pathname, search = '') {
  if (pathname === '/markets') return 'markets';
  if (pathname === '/startline-dashboard' || pathname.startsWith('/starline-market')) return 'starline';
  if (pathname === '/king-bazaar-market') return 'kingBazaar';
  if (pathname === '/games') {
    const cat = new URLSearchParams(search).get('category');
    if (cat === 'highEarning') return 'casino';
    if (cat === 'skills' || cat === 'upcoming') return 'skills';
  }
  if (pathname === '/') return 'home';
  return null;
}

export function useDashboardNav() {
  const navigate = useNavigate();

  return useCallback((panel) => {
    switch (panel) {
      case 'markets':
        navigate('/markets');
        break;
      case 'casino':
        navigate('/games?category=highEarning');
        break;
      case 'skills':
        navigate('/games?category=skills');
        break;
      case 'kingBazaar':
        navigate('/king-bazaar-market');
        break;
      case 'starline':
        navigate('/startline-dashboard');
        break;
      case 'home':
        navigate('/');
        break;
      default:
        navigate('/');
        break;
    }
  }, [navigate]);
}

export function categoryPathActive(cat, pathname, search = '') {
  if (!cat.path) return false;
  const [base, query] = cat.path.split('?');
  if (base === '/') return pathname === '/';
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}
