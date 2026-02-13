import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lineups } from '../api/client';
import ArtistSearch from '../components/ArtistSearch';
import LineupSlotWithNote from '../components/LineupSlotWithNote';
import TagInput from '../components/TagInput';
import Navbar from '../components/Navbar';

export default function EditLineup() {
  const { id } = useParams();
  const [lineup, setLineup] = useState([null, null, null, null, null]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Load existing lineup
  useEffect(() => {
    const fetchLineup = async () => {
      if (!user) return;
      try {
        const res = await lineups.getOne(id);
        const data = res.data;

        setTitle(data.title);
        setDescription(data.description || '');
        setTags(data.tags || []);
        setIsPublic(!!data.is_public);

        // Map artists to lineup slots
        const newLineup = [null, null, null, null, null];
        data.artists.forEach((artist) => {
          newLineup[artist.slot_position] = {
            name: artist.artist_name,
            image: artist.artist_image,
            mbid: artist.artist_mbid,
            spotifyId: artist.artist_spotify_id,
            spotifyUrl: artist.artist_spotify_url,
            note: artist.note || '',
          };
        });
        setLineup(newLineup);
      } catch (err) {
        setError('Failed to load lineup');
      } finally {
        setLoading(false);
      }
    };
    fetchLineup();
  }, [id, user]);

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
      await lineups.update(id, {
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        tags,
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
      navigate(`/lineup/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lineup');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl uppercase">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-tight">EDIT YOUR LINEUP</h1>
          <button
            onClick={() => navigate('/my-lineups')}
            className="text-gray-500 hover:text-white uppercase"
          >
            CANCEL
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

            {/* Tags */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 uppercase">TAGS</h2>
              <TagInput tags={tags} onChange={setTags} />
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
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
