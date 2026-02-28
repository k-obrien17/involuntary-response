import { createContext, useContext, useState } from 'react';

const ProfilePanelContext = createContext();

export function ProfilePanelProvider({ children }) {
  const [username, setUsername] = useState(null);

  const openProfile = (u) => setUsername(u);
  const closePanel = () => setUsername(null);

  return (
    <ProfilePanelContext.Provider value={{ username, openProfile, closePanel }}>
      {children}
    </ProfilePanelContext.Provider>
  );
}

export function useProfilePanel() {
  return useContext(ProfilePanelContext);
}
