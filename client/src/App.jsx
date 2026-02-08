import { useAlien } from './context/AlienContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ClubPage from './pages/ClubPage';
import ClubJoin from './pages/ClubJoin';
import ProposalPage from './pages/ProposalPage';
import ReceiptPage from './pages/ReceiptPage';
import CreateClub from './pages/CreateClub';

function App() {
  const { authToken, isBridgeAvailable } = useAlien();

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto min-h-screen pb-8">
        <header className="sticky top-0 z-10 bg-alien-dark/95 backdrop-blur border-b border-slate-800 px-4 py-3">
          <h1 className="text-lg font-bold text-cyan-400">VoteTheTicker</h1>
        </header>

        {!isBridgeAvailable && (
          <div className="mx-4 mt-4 p-4 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-200 text-sm">
            Open this app inside Alien for full authentication.
          </div>
        )}

        <main className="px-4 py-4">
          <Routes>
            <Route path="/" element={<Home authToken={authToken} />} />
            <Route path="/clubs/new" element={<CreateClub authToken={authToken} />} />
            <Route path="/clubs/:slug" element={<ClubPage authToken={authToken} />} />
            <Route path="/clubs/:slug/join" element={<ClubJoin authToken={authToken} />} />
            <Route path="/proposals/:id" element={<ProposalPage authToken={authToken} />} />
            <Route path="/proposals/:id/receipt" element={<ReceiptPage authToken={authToken} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
