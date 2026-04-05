import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Tutor from './pages/Tutor';
import Evaluator from './pages/Evaluator';
import Profile from './pages/Profile';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/evaluator" element={<Evaluator />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
