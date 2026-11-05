import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GAME_STATUSES, GameStatus } from '../types';

export const AddGamePage: React.FC = () => {
  const { games, addGame, toggleGameStatus, setActivePage } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<GameStatus | ''>('available');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim()) {
      setMessage({ text: 'Game name is required', type: 'error' });
      return;
    }

    if (!status) {
      setMessage({ text: 'Please select a status', type: 'error' });
      return;
    }

    const result = await addGame(name, description, status);
    if (result.success) {
      setMessage({ text: `Game "${name}" created successfully!`, type: 'success' });
      setName('');
      setDescription('');
      setStatus('available');
    } else {
      setMessage({ text: result.error || 'Failed to add game', type: 'error' });
    }
  };

  return (
    <div className="max-w-[800px] mx-auto py-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Form Container (Matches templates/add_game.html) */}
        <div className="md:col-span-7 bg-white p-[30px] rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-[#222] m-0">Add a New Game</h1>
            <button
              onClick={() => setActivePage('transaction')}
              className="text-xs text-[#2e6b63] hover:underline cursor-pointer"
            >
              ← Back to Register
            </button>
          </div>

          {message && (
            <div
              role="alert"
              className={`mb-5 p-3 rounded-md text-sm font-medium border ${
                message.type === 'success'
                  ? 'bg-[#eaf7f3] border-[#a3dfd3] text-[#136154]'
                  : 'bg-[#fff1f1] border-[#f2c5c5] text-[#a12b2b]'
              }`}
            >
              {message.type === 'success' ? '✓ ' : '⚠ '}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block mt-[18px] mb-[8px] font-bold text-sm text-[#222]">
                Game Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Enter game name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full p-3 border border-[#ccc] rounded-[6px] text-[15px] outline-none focus:border-[#2e6b63] bg-white transition-colors"
              />
            </div>

            <div>
              <label htmlFor="description" className="block mt-[18px] mb-[8px] font-bold text-sm text-[#222]">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Describe the game"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                className="w-full p-3 border border-[#ccc] rounded-[6px] text-[15px] outline-none focus:border-[#2e6b63] bg-white transition-colors resize-y"
              />
            </div>

            <div>
              <label htmlFor="status" className="block mt-[18px] mb-[8px] font-bold text-sm text-[#222]">
                Game Status
              </label>
              <select
                id="status"
                name="status"
                value={status}
                onChange={e => setStatus(e.target.value as GameStatus)}
                required
                className="w-full p-3 border border-[#ccc] rounded-[6px] text-[15px] outline-none focus:border-[#2e6b63] bg-white transition-colors"
              >
                <option value="">-- Select status --</option>
                {GAME_STATUSES.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-[24px] p-[13px] bg-[#2e6b63] hover:bg-[#24564f] text-white border-none rounded-[6px] text-[16px] font-bold cursor-pointer transition-colors shadow-sm"
            >
              Create Game
            </button>
          </form>
        </div>

        {/* Existing Games List with Live Status Toggle */}
        <div className="md:col-span-5 bg-white p-[25px] rounded-[10px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h2 className="text-base font-bold text-[#222]">Games Catalog ({games.length})</h2>
            <span className="text-xs text-gray-400">Click badge to toggle</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto pr-1">
            {games.map(game => (
              <div key={game.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">{game.name}</div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{game.description}</p>
                </div>
                <button
                  onClick={() => toggleGameStatus(game.id)}
                  title="Click to toggle status (available / unavailable)"
                  className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer select-none ${
                    game.status === 'available'
                      ? 'bg-[#e2f4ed] text-[#13796d] hover:bg-[#d0ece2]'
                      : 'bg-[#fbeaea] text-[#b83232] hover:bg-[#f5d5d5]'
                  }`}
                >
                  {game.status === 'available' ? '● Available' : '○ Unavailable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
