import { useState } from 'react';

export default function LineupSlotWithNote({ position, artist, onRemove, onNoteChange, onMoveUp, onMoveDown, isFirst, isLast }) {
  const slotLabels = ['OPENER', 'SECOND', 'THIRD', 'FOURTH', 'HEADLINER'];
  const [showNote, setShowNote] = useState(false);

  return (
    <div
      className={`border-2 transition ${
        artist
          ? 'border-white'
          : 'border-white/30 border-dashed'
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="w-8 h-8 bg-white/20 flex items-center justify-center font-bold text-sm">
          {String(position).padStart(2, '0')}
        </div>

        {artist ? (
          <>
            {artist.image ? (
              <img
                src={artist.image}
                alt={artist.name}
                className="w-14 h-14 object-cover border border-white/50"
              />
            ) : (
              <div className="w-14 h-14 bg-white/10 border border-white/50 flex items-center justify-center text-gray-500 font-bold">
                ?
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-lg uppercase">{artist.name}</p>
              <p className="text-gray-500 text-sm uppercase">{slotLabels[position - 1]}</p>
            </div>
            <button
              onClick={() => setShowNote(!showNote)}
              className={`px-3 py-1 text-sm transition uppercase ${
                artist.note
                  ? 'bg-white text-black'
                  : 'bg-white/20 text-gray-500 hover:bg-white/30'
              }`}
            >
              {artist.note ? 'EDIT NOTE' : '+ NOTE'}
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="w-6 h-6 bg-white/20 text-white hover:bg-white hover:text-black transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs"
              >
                ^
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="w-6 h-6 bg-white/20 text-white hover:bg-white hover:text-black transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xs"
              >
                v
              </button>
            </div>
            <button
              onClick={onRemove}
              className="w-8 h-8 bg-white/20 text-white hover:bg-white hover:text-black transition flex items-center justify-center font-bold"
            >
              X
            </button>
          </>
        ) : (
          <div className="flex-1 text-gray-600">
            <p className="font-bold uppercase">{slotLabels[position - 1]}</p>
            <p className="text-sm uppercase">SEARCH AND ADD AN ARTIST</p>
          </div>
        )}
      </div>

      {/* Note input area */}
      {artist && showNote && (
        <div className="px-4 pb-4">
          <textarea
            value={artist.note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder={`WHY DID YOU PICK ${artist.name.toUpperCase()}?`}
            className="w-full px-3 py-2 bg-black border-2 border-white text-white placeholder-gray-600 text-sm focus:outline-none resize-none uppercase"
            rows={2}
          />
        </div>
      )}

      {/* Show note preview when collapsed */}
      {artist && artist.note && !showNote && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500 truncate">"{artist.note}"</p>
        </div>
      )}
    </div>
  );
}
