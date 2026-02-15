export default function LineupSlot({ position, artist, onRemove }) {
  const slotLabels = ['OPENER', 'SECOND', 'THIRD', 'FOURTH', 'HEADLINER'];

  return (
    <div
      className={`flex items-center gap-4 p-4 border-2 transition ${
        artist
          ? 'border-white'
          : 'border-white/30 border-dashed'
      }`}
    >
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
  );
}
