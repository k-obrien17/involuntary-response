import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-black border-t-2 border-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="text-2xl font-bold text-white uppercase tracking-wider">
              BACKYARD MARQUEE
            </Link>
            <p className="text-gray-500 mt-4 max-w-md">
              Create your dream concert lineup with 5 artists. Share it with friends and see what lineups others are building.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wide">EXPLORE</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/discover" className="text-gray-500 hover:text-white transition uppercase">
                  Discover Lineups
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="text-gray-500 hover:text-white transition uppercase">
                  Artist Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-gray-500 hover:text-white transition uppercase">
                  Create Lineup
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wide">ACCOUNT</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="text-gray-500 hover:text-white transition uppercase">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-500 hover:text-white transition uppercase">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/my-lineups" className="text-gray-500 hover:text-white transition uppercase">
                  My Lineup
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t-2 border-white mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm uppercase">
            {new Date().getFullYear()} BACKYARD MARQUEE
          </p>
          <p className="text-gray-600 text-xs uppercase">
            Artist data powered by Spotify
          </p>
        </div>
      </div>
    </footer>
  );
}
