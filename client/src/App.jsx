import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AdminRoute from './components/AdminRoute';
import ContributorRoute from './components/ContributorRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/admin/Dashboard';
import AdminInvites from './pages/admin/Invites';
import AdminContributors from './pages/admin/Contributors';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import ViewPost from './pages/ViewPost';
import TagBrowse from './pages/TagBrowse';
import ArtistPage from './pages/ArtistPage';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Search from './pages/Search';
import JoinPage from './pages/JoinPage';
import MyPosts from './pages/MyPosts';
import Stats from './pages/Stats';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/invites"
            element={
              <AdminRoute>
                <AdminInvites />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/contributors"
            element={
              <AdminRoute>
                <AdminContributors />
              </AdminRoute>
            }
          />
          <Route
            path="/posts/new"
            element={
              <ContributorRoute>
                <CreatePost />
              </ContributorRoute>
            }
          />
          <Route
            path="/my-posts"
            element={
              <ContributorRoute>
                <MyPosts />
              </ContributorRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ContributorRoute>
                <Stats />
              </ContributorRoute>
            }
          />
          <Route path="/tag/:tag" element={<TagBrowse />} />
          <Route path="/artist/:name" element={<ArtistPage />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="/posts/:slug" element={<ViewPost />} />
          <Route
            path="/posts/:slug/edit"
            element={
              <ContributorRoute>
                <EditPost />
              </ContributorRoute>
            }
          />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
