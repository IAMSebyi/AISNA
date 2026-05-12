import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SideNavBar from './components/SideNavBar';
import TopNavBar from './components/TopNavBar';
import Terminal from './pages/Terminal';
import Analysis from './pages/Analysis';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="bg-background text-on-background min-h-screen flex font-body-md dark">
        <SideNavBar />
        <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
          <TopNavBar />
          <div className="flex-1 p-margin-mobile md:p-margin-desktop overflow-y-auto pb-24">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Terminal />} />
              <Route path="/terminal" element={<Terminal />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
