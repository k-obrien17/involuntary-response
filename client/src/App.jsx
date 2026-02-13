import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateLineup from './pages/CreateLineup';
import ViewLineup from './pages/ViewLineup';
import MyLineups from './pages/MyLineups';
import Leaderboard from './pages/Leaderboard';
import ArtistDetail from './pages/ArtistDetail';
import Discover from './pages/Discover';
import EditLineup from './pages/EditLineup';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create" element={<CreateLineup />} />
          <Route path="/lineup/:id" element={<ViewLineup />} />
          <Route path="/my-lineups" element={<MyLineups />} />
          <Route path="/my-lineup" element={<Navigate to="/my-lineups" replace />} />
          <Route path="/edit/:id" element={<EditLineup />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/artist/:name" element={<ArtistDetail />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/user/:username" element={<UserProfile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
