import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import Tutor from './pages/Tutor';
import Evaluator from './pages/Evaluator';
import Documents from './pages/Documents';
import Profile from './pages/Profile';

function App() {
  return (
    <ThemeProvider>
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
              <Route path="/documents" element={<Documents />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
    </ThemeProvider>
  );
}

export default App;
