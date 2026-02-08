import { getWatchlist } from './watchlistService.js';

const SAMPLE_ANALYSIS = {
  AAPL: {
    thesis: ['Strong ecosystem lock-in', 'Services revenue growing', 'Cash-rich balance sheet'],
    risks: ['China exposure', 'Regulatory scrutiny', 'Valuation premium'],
    unknowns: ['Apple Intelligence monetization', 'India manufacturing scale'],
    confidence: 'Medium-High',
    reasoning: 'Stable core business with optionality.',
  },
  GOOGL: {
    thesis: ['Search dominance', 'Cloud growth', 'AI investments'],
    risks: ['Antitrust', 'Cloud margin pressure', 'AI capex'],
    unknowns: ['Gemini adoption', 'YouTube profitability'],
    confidence: 'Medium',
    reasoning: 'AI race participant with diversified revenue.',
  },
  MSFT: {
    thesis: ['Azure leader', 'Copilot integration', 'OpenAI partnership'],
    risks: ['AI ROI uncertain', 'Antitrust', 'Cloud competition'],
    unknowns: ['Copilot adoption', 'OpenAI economics'],
    confidence: 'Medium-High',
    reasoning: 'Best positioned for enterprise AI.',
  },
  NVDA: {
    thesis: ['AI chip dominance', 'Data center demand', 'Software moat'],
    risks: ['Cyclical', 'Competition', 'Geopolitical'],
    unknowns: ['Next-gen Blackwell ramp', 'China restrictions'],
    confidence: 'High (short-term)',
    reasoning: 'Key AI beneficiary but volatile.',
  },
  META: {
    thesis: ['Advertising scale', 'Reality Labs optionality', 'Efficiency focus'],
    risks: ['Regulation', 'TikTok competition', 'Metaverse burn'],
    unknowns: ['AR/VR adoption', 'AI agent monetization'],
    confidence: 'Medium',
    reasoning: 'Cheap vs growth potential.',
  },
};

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Generate 3 proposal candidates from watchlist.
 * Educational only — not financial advice.
 */
export async function generateProposalCandidates(clubId) {
  const watchlist = await getWatchlist(clubId);
  const tickers = watchlist.map(w => w.ticker).filter(Boolean);

  const universe = tickers.length >= 3 ? tickers : Object.keys(SAMPLE_ANALYSIS);
  const selected = pickRandom(universe, 3);

  const candidates = selected.map((ticker, i) => {
    const a = SAMPLE_ANALYSIS[ticker] || {
      thesis: ['Strong fundamentals', 'Sector leader', 'Growth potential'],
      risks: ['Market risk', 'Competition', 'Valuation'],
      unknowns: ['Future catalysts', 'Management execution'],
      confidence: 'Medium',
      reasoning: 'General analysis. Not financial advice.',
    };
    return {
      ticker,
      thesis_bullets: a.thesis,
      risk_bullets: a.risks,
      unknowns: a.unknowns,
      confidence: a.confidence,
      reasoning: a.reasoning,
      sort_order: i,
    };
  });

  const thesisSummary = `Educational proposal: ${selected.join(', ')}. Not financial advice. Risk/unknowns included. Data illustrative only.`;

  return { candidates, thesisSummary };
}
