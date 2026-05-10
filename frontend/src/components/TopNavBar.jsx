import { Link, useLocation } from 'react-router-dom';

export default function TopNavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-sm docked full-width top-0 sticky z-50">
      <div className="flex justify-between items-center w-full px-margin-desktop py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-md">
          <span className="md:hidden font-display-lg text-display-lg font-bold text-primary">EquiSynth AI</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link className={`font-medium hover:text-primary transition-colors duration-200 font-body-md text-body-md ${isActive('/') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant'}`} to="/">Dashboard</Link>
            <Link className={`font-medium hover:text-primary transition-colors duration-200 font-body-md text-body-md ${isActive('/portfolio') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant'}`} to="/portfolio">Saved Tickers</Link>
            <Link className={`font-medium hover:text-primary transition-colors duration-200 font-body-md text-body-md ${isActive('/portfolio') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant'}`} to="/portfolio">Portfolio</Link>
            <Link className={`font-medium hover:text-primary transition-colors duration-200 font-body-md text-body-md ${isActive('/analysis') ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-on-surface-variant'}`} to="/analysis">Analysis</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">history</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline/30">
            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCevc7ApJNlfWSqI8A0neEh6jt3f3kEixNqsBssOFi3o-4syEDmeASZ3bas9gxLggnLTVYOP2nBprBcjbynu1HIDfWLh-Ez1pGH6scgFWufLbTpzn7SedbPAn6xYt42j3_m5bqqeQQVlY6bdfWmfPNW5Yh2iW6P_8XWt9DcBW1QKxMF1N0qIVwr8oFlUCPvOZMdyBynvps0fToqRJ7k8nZy2QjOjZswXOMQGroDR1Nlfz8OvqIjU9hH7mypWpYe1gNHeXsf98aySsdM"/>
          </div>
        </div>
      </div>
    </header>
  );
}
