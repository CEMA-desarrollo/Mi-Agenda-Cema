import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Agenda } from './pages/Agenda';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { ReloadPrompt } from './components/ReloadPrompt';

function App() {
  return (
    <>
      <ReloadPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Agenda />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
