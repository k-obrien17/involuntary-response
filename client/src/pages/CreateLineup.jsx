import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lineups } from '../api/client';
import ArtistSearch from '../components/ArtistSearch';
import LineupSlotWithNote from '../components/LineupSlotWithNote';
import Navbar from '../components/Navbar';

export default function CreateLineup() {
  const [lineup, setLineup] = useState([null, null, null, null, null]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasExisting, setHasExisting] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Check if user already has a lineup
  useEffect(() => {
    const checkExisting = async () => {
      if (!user) return;
      try {
        const res = await lineups.getAll();
        if (res.data.length > 0) {
          setHasExisting(true);
        }
      } catch (err) {
        console.error('Failed to check existing lineups:', err);
      }
    };
    checkExisting();
  }, [user]);

  const addArtist = (artist) => {
    const emptySlot = lineup.findIndex((slot) => slot === null);
    if (emptySlot !== -1) {
      const newLineup = [...lineup];
      newLineup[emptySlot] = { ...artist, note: '' };
      setLineup(newLineup);
    }
  };

  const removeArtist = (index) => {
    const newLineup = [...lineup];
    newLineup[index] = null;
    setLineup(newLineup);
  };

  const updateNote = (index, note) => {
    const newLineup = [...lineup];
    if (newLineup[index]) {
      newLineup[index] = { ...newLineup[index], note };
      setLineup(newLineup);
    }
  };

  const moveArtist = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= lineup.length) return;
    const newLineup = [...lineup];
    [newLineup[index], newLineup[newIndex]] = [newLineup[newIndex], newLineup[index]];
    setLineup(newLineup);
  };

  const isLineupFull = lineup.every((slot) => slot !== null);
  const hasArtists = lineup.some((slot) => slot !== null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please give your lineup a name');
      return;
    }

    if (!hasArtists) {
      setError('Add at least one artist to your lineup');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await lineups.create({
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        artists: lineup.filter(Boolean).map((artist, index) => ({
          slot_position: index,
          artist_name: artist.name,
          artist_image: artist.image,
          artist_mbid: artist.mbid || null,
          artist_spotify_id: artist.spotifyId || null,
          artist_spotify_url: artist.spotifyUrl || null,
          note: artist.note || null,
        })),
      });
      navigate(`/lineup/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lineup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl uppercase">LOADING...</div>
      </div>
    );
  }

  if (hasExisting) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4 uppercase">YOU ALREADY HAVE A LINEUP</h1>
            <p className="text-gray-500 mb-6 uppercase">Each person can only create one marquee lineup.</p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/my-lineup')}
                className="bg-white text-black px-6 py-3 font-bold uppercase hover:bg-gray-200 transition"
              >
                VIEW MY LINEUP
              </button>
              <button
                onClick={() => navigate('/')}
                className="border-2 border-white px-6 py-3 font-bold uppercase hover:bg-white hover:text-black transition"
              >
                GO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center uppercase tracking-tight">CREATE YOUR LINEUP</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Artist Search */}
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase">SEARCH ARTISTS</h2>
            <ArtistSearch
              onSelect={addArtist}
              disabled={isLineupFull}
              selectedArtists={lineup.filter(Boolean).map((a) => a.name)}
            />

            {/* Overall Description */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 uppercase">ABOUT YOUR LINEUP</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="WHY DID YOU CHOOSE THESE ARTISTS? WHAT'S THE VIBE?"
                className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none min-h-[120px] resize-none uppercase"
              />
            </div>
          </div>

          {/* Lineup Builder */}
          <div>
            <h2 className="text-2xl font-bold mb-4 uppercase">YOUR LINEUP</h2>

            <div className="border-2 border-white p-6">
              <div className="space-y-4">
                {lineup.map((artist, index) => (
                  <LineupSlotWithNote
                    key={index}
                    position={index + 1}
                    artist={artist}
                    onRemove={() => removeArtist(index)}
                    onNoteChange={(note) => updateNote(index, note)}
                    onMoveUp={() => moveArtist(index, -1)}
                    onMoveDown={() => moveArtist(index, 1)}
                    isFirst={index === 0}
                    isLast={index === lineup.length - 1}
                  />
                ))}
              </div>

              {error && (
                <div className="mt-4 border-2 border-white text-white px-4 py-3 uppercase text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-sm">LINEUP NAME</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="MY DREAM CONCERT"
                    className="w-full px-4 py-3 bg-black border-2 border-white text-white placeholder-gray-600 focus:outline-none uppercase"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-gray-500 uppercase text-sm">MAKE THIS LINEUP PUBLIC (SHAREABLE)</span>
                </label>

                <button
                  onClick={handleSave}
                  disabled={saving || !hasArtists}
                  className="w-full bg-white text-black py-3 font-bold uppercase hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'SAVE LINEUP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
