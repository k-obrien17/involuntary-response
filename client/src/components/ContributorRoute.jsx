import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ContributorRoute({ children }) {
  const { user, loading, isContributor } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isContributor) {
    return <Navigate to="/" replace />;
  }

  return children;
}
