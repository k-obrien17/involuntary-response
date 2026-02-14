import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <div
        className="relative min-h-[85vh] flex items-center justify-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/80"></div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white uppercase tracking-tight">
            BACKYARD MARQUEE
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Create your dream 5-artist concert lineup. Pick your headliners,
            build your perfect setlist, and share it with the world.
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/create"
                className="inline-block bg-white text-black px-8 py-4 text-lg font-bold uppercase hover:bg-gray-200 transition"
              >
                CREATE NEW LINEUP
              </Link>
              <Link
                to="/my-lineups"
                className="inline-block border-2 border-white px-8 py-4 text-lg font-bold uppercase hover:bg-white hover:text-black transition"
              >
                MY LINEUPS
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="inline-block bg-white text-black px-8 py-4 text-lg font-bold uppercase hover:bg-gray-200 transition"
              >
                GET STARTED
              </Link>
              <Link
                to="/discover"
                className="inline-block border-2 border-white px-8 py-4 text-lg font-bold uppercase hover:bg-white hover:text-black transition"
              >
                BROWSE LINEUPS
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-black py-20 border-t-2 border-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 uppercase tracking-wide">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 border-2 border-white">
              <div className="text-5xl mb-4 font-bold">01</div>
              <h3 className="text-xl font-bold mb-2 uppercase">SEARCH ARTISTS</h3>
              <p className="text-gray-500">Find your favorite bands and artists from millions in our database</p>
            </div>
            <div className="text-center p-6 border-2 border-white">
              <div className="text-5xl mb-4 font-bold">02</div>
              <h3 className="text-xl font-bold mb-2 uppercase">BUILD YOUR LINEUP</h3>
              <p className="text-gray-500">Pick 5 artists for your dream backyard concert</p>
            </div>
            <div className="text-center p-6 border-2 border-white">
              <div className="text-5xl mb-4 font-bold">03</div>
              <h3 className="text-xl font-bold mb-2 uppercase">SHARE IT</h3>
              <p className="text-gray-500">Get a shareable link to show off your perfect lineup</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link
              to="/leaderboard"
              className="text-white hover:text-gray-400 text-lg font-bold uppercase border-b-2 border-white hover:border-gray-400 transition"
            >
              SEE THE MOST POPULAR ARTISTS
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
