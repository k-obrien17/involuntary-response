import { Link } from 'react-router-dom';

export default function About() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-12">

        {/* Section 1: What is Involuntary Response? */}
        <section>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            What is Involuntary Response?
          </h1>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              A place for visceral, honest reactions to music. Not reviews. Not ratings.
              Someone heard a song and needed to write about it. That impulse — the one
              that hits before you can think of a star count — is what lives here.
            </p>
            <p>
              Every post has the music embedded right there. You read the reaction, you
              press play, you decide for yourself. No intermediary telling you what to
              feel first.
            </p>
            <p>
              Think of it as a feed of musical moments. Not a recommendation engine, not
              a playlist generator. Just people and the songs that stopped them in their
              tracks.
            </p>
          </div>
        </section>

        {/* Section 2: Who's behind this? */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Who's behind this?
          </h2>
          <div className="mt-4 space-y-4 text-lg leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              Built by someone who got tired of algorithmic playlists telling them what
              to feel about music. The best recommendations have always come from a
              friend grabbing your arm and saying "you have to hear this" — so that's
              what this is trying to be.
            </p>
            <p>
              No venture capital. No growth metrics. Just a small corner of the internet
              where the music speaks for itself.
            </p>
          </div>
        </section>

        {/* Section 3: Join / Subscribe */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Get involved
          </h2>
          <div className="mt-4 space-y-3 text-lg text-gray-700 dark:text-gray-300">
            <p>
              <Link
                to="/join"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-4 hover:text-gray-500 dark:hover:text-gray-400 transition"
              >
                Join as a reader
              </Link>
              {' '}&mdash; get an account and start following along.
            </p>
            <p>
              <a
                href="/api/rss"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-gray-100 underline underline-offset-4 hover:text-gray-500 dark:hover:text-gray-400 transition"
              >
                Subscribe via RSS
              </a>
              {' '}&mdash; new posts in your reader, no account needed.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
