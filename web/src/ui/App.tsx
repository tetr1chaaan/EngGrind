import { useEffect, useRef, useState } from 'react';
import { loadTelegramUser, loadTelegramWords, saveTelegramWord, telegram, type TelegramUser } from '../telegram';

type View = 'home' | 'reading' | 'listening' | 'words';
type WordCard = { word: string; meaning: string; example: string };
type StreakData = { days: string[]; best: number };

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function readStreak(): StreakData {
  try { return JSON.parse(localStorage.getItem('enggrind.streak') || '{"days":[],"best":0}') as StreakData; }
  catch { return { days: [], best: 0 }; }
}
function currentStreak(data: StreakData) {
  const days = [...new Set(data.days || [])].sort();
  const today = dayKey(new Date());
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  let count = 0;
  if (days.at(-1) === today || days.at(-1) === dayKey(yesterday)) {
    let cursor = new Date(`${days.at(-1)}T12:00:00`);
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i] !== dayKey(cursor)) break;
      count++; cursor.setDate(cursor.getDate() - 1);
    }
  }
  return { days, today, count, best: Math.max(data.best || 0, count) };
}

const passage = 'For decades, city parks have been carefully managed: lawns cut short, flower beds arranged in neat rows, and every path kept clear. But a growing number of urban planners are questioning whether this polished approach is always the best one. In several European cities, councils have begun leaving small areas of public green space to grow more naturally. Tall grasses and wildflowers attract insects, which support birds and other wildlife. These changes can seem subtle, but their effects reach far beyond the park itself. Access to biodiverse green spaces can improve people’s mood and help them feel more connected to their neighbourhood.';
const vocab: Record<string, string> = {
  subtle: 'Not obvious or easy to notice; expressed in a quiet or delicate way.',
  biodiverse: 'Containing many different kinds of plants and animals.',
  neighbourhood: 'A district or community within a town or city.',
  vibrant: 'Full of energy, life, and activity.',
};
const example = 'The subtle changes in the park made it a more welcoming place.';

function readWords(): WordCard[] {
  try { return JSON.parse(localStorage.getItem('enggrind.cards') || '[]') as WordCard[]; }
  catch { return []; }
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [cards, setCards] = useState<WordCard[]>(readWords);
  const [streak, setStreak] = useState<StreakData>(readStreak);
  const [answer, setAnswer] = useState('parks');
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectionAction, setSelectionAction] = useState<{ word: string; left: number; top: number } | null>(null);
  const passageRef = useRef<HTMLElement | null>(null);
  const actionRef = useRef<() => void>(() => {});

  useEffect(() => {
    telegram?.ready();
    telegram?.expand();
    loadTelegramUser().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const goBack = () => setView('home');
    telegram?.BackButton.onClick(goBack);
    return () => telegram?.BackButton.offClick(goBack);
  }, []);

  useEffect(() => {
    if (view !== 'reading') {
      setSelectionAction(null);
      return;
    }

    const updateSelectionAction = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      const anchor = selection?.anchorNode;
      const focus = selection?.focusNode;
      if (!text || /\s/.test(text) || !anchor || !focus || !passageRef.current?.contains(anchor) || !passageRef.current.contains(focus)) {
        setSelectionAction(null);
        return;
      }

      const range = selection!.getRangeAt(0);
      if (range.startContainer !== range.endContainer || range.startContainer.nodeType !== Node.TEXT_NODE) {
        setSelectionAction(null);
        return;
      }
      const textNode = range.startContainer.textContent || '';
      const before = textNode.slice(0, range.startOffset).slice(-1);
      const after = textNode.slice(range.endOffset, range.endOffset + 1);
      const isWordCharacter = (character: string) => /[\p{L}\p{M}'’-]/u.test(character);
      if (isWordCharacter(before) || isWordCharacter(after) || [...text].length < 2) {
        setSelectionAction(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const word = text.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '');
      if (!word || !rect.width) {
        setSelectionAction(null);
        return;
      }
      setSelectionAction({ word, left: rect.left + rect.width / 2, top: Math.max(52, rect.top - 8) });
    };

    document.addEventListener('selectionchange', updateSelectionAction);
    return () => document.removeEventListener('selectionchange', updateSelectionAction);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('enggrind.cards', JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('enggrind.streak', JSON.stringify(streak));
  }, [streak]);

  function markPracticeDay() {
    setStreak((previous) => {
      const info = currentStreak(previous);
      const days = info.days.includes(info.today) ? info.days : [...info.days, info.today].sort();
      let run = 0, best = info.best, prior = '';
      for (const day of days) {
        const date = new Date(`${day}T12:00:00`);
        const expected = new Date(`${prior}T12:00:00`); expected.setDate(expected.getDate() + 1);
        run = prior && dayKey(expected) === day ? run + 1 : 1;
        best = Math.max(best, run); prior = day;
      }
      return { days, best };
    });
  }

  useEffect(() => {
    if (!user || !telegram?.initData) return;
    loadTelegramWords().then(setCards).catch(() => setNotice('Could not sync your saved words yet.'));
  }, [user]);

  useEffect(() => {
    const toggleBack = () => view === 'home' ? telegram?.BackButton.hide() : telegram?.BackButton.show();
    toggleBack();
    const actions: Record<View, { label: string; run: () => void }> = {
      home: { label: 'Start today’s practice', run: () => { setView('reading'); setChecked(false); } },
      reading: { label: checked ? 'Continue to listening' : 'Check answer', run: () => checked ? setView('listening') : setChecked(true) },
      listening: { label: 'Review vocabulary', run: () => setView('words') },
      words: { label: 'Back to learning', run: () => setView('home') },
    };
    const current = actions[view];
    actionRef.current = current.run;
    const main = telegram?.MainButton;
    const onMainClick = () => actionRef.current();
    main?.setText(current.label);
    main?.onClick(onMainClick);
    main?.show();
    return () => main?.offClick(onMainClick);
  }, [view, checked]);

  function addWord(word: string) {
    const normalizedWord = word.trim().replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '').toLowerCase();
    if (!normalizedWord) return;
    const meaning = '';
    const cardExample = '';
    if (cards.some((card) => card.word.toLowerCase() === normalizedWord)) {
      setNotice(`${normalizedWord} is already in your list.`);
      setView('words');
      return;
    }
    setCards((existing) => [{ word: normalizedWord, meaning, example: cardExample }, ...existing]);
    setNotice(`${normalizedWord} added to your words.`);
    setView('words');
    if (user && telegram?.initData) {
      saveTelegramWord({ word: normalizedWord, meaning, example: cardExample }).catch(() => setNotice('Saved on this device; server sync failed.'));
    }
    window.setTimeout(() => setNotice(''), 2200);
  }

  const greet = user?.first_name ? `Hi, ${user.first_name}` : 'Your English, every day';
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">e</span><span>enggrind<span className="brand-dot">.</span></span></div><span className="profile">{user ? user.first_name.slice(0, 1).toUpperCase() : 'E'}</span></header>
    <main>
      {view === 'home' && <>
        <section className="welcome"><p className="eyebrow">YOUR DAILY PRACTICE</p><h1>{greet}</h1><p>Build a small English habit, one session at a time.</p></section>
        {(() => { const info = currentStreak(streak); const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => { const date = new Date(monday); date.setDate(monday.getDate() + i); const key = dayKey(date); const done = info.days.includes(key); return <span key={key} className={`${done ? 'done' : ''} ${key === info.today ? 'today' : ''}`} aria-label={`${key}${done ? ', practiced' : ''}`}>{done ? '✓' : label}</span>; }); return <section className="streak-panel"><div className="streak-copy"><span className="streak-eyebrow">YOUR CONSISTENCY</span><h2>{info.count} day{info.count === 1 ? '' : 's'} in a row</h2><p>{info.count ? 'You’re building a strong habit. Keep it going!' : 'Complete a practice session today to start your streak.'}</p><small>Personal best: <b>{info.best} days</b></small></div><div className="streak-week" aria-label="Practice days this week">{week}</div></section>; })()}
        <button className="start-card" onClick={() => { setView('reading'); setChecked(false); }}><span className="start-icon">↗</span><span><b>Make today count</b><small>Reading + listening · 15 min</small></span><span className="arrow">›</span></button>
        <h2 className="section-title">Continue learning</h2>
        <button className="module" onClick={() => { setView('reading'); setChecked(false); }}><span className="module-icon">▤</span><span><b>Reading practice</b><small>Why cities need wilder spaces · B2</small></span><span className="arrow">›</span></button>
        <button className="module" onClick={() => setView('listening')}><span className="module-icon">◖</span><span><b>Listening practice</b><small>A greener neighbourhood · 7 min</small></span><span className="arrow">›</span></button>
        <button className="module" onClick={() => setView('words')}><span className="module-icon">▱</span><span><b>My words</b><small>{cards.length} saved vocabulary cards</small></span><span className="arrow">›</span></button>
      </>}
      {view === 'reading' && <>
        <p className="eyebrow">READING · B2 INTERMEDIATE</p><h1 className="page-title">Why cities need wilder spaces</h1><p className="intro">Select a word in the passage, then choose “Add a word” to save it to your flashcards.</p>
        <article className="passage" ref={passageRef}>{passage.split(/(subtle|biodiverse|neighbourhood)/g).map((part, i) => vocab[part] ? <mark key={`${part}-${i}`} className="word">{part}</mark> : part)}</article>
        <section className="question"><b>What is the main idea?</b>
          {[["parks", 'Parks can support both people and nature.'], ['lawns', 'Short lawns are the best way to manage parks.'], ['insects', 'Cities should focus only on attracting insects.']].map(([id, label]) => <label key={id} className="choice"><input type="radio" name="answer" value={id} checked={answer === id} onChange={() => setAnswer(id)} />{label}</label>)}
          {checked && <p className={answer === 'parks' ? 'feedback good' : 'feedback'}>{answer === 'parks' ? 'That’s right. The passage describes how urban green spaces can benefit people and wildlife.' : 'Try again. Look for the idea that connects nature with the community.'}</p>}
        </section>
          <button className="primary inline-action" onClick={() => { if (answer === 'parks') markPracticeDay(); if (checked) setView('listening'); else setChecked(true); }}>{checked ? 'Continue to listening' : 'Check answer'} <span>→</span></button>
      </>}
      {view === 'listening' && <>
        <p className="eyebrow">LISTENING · B2</p><h1 className="page-title">A greener neighbourhood</h1><p className="intro">A short listening practice. Audio playback will be added in the next prototype step.</p>
        <section className="audio-placeholder"><span>▶</span><div><b>Community garden conversation</b><small>Transcript-based practice · 2 min</small></div></section>
        <article className="passage dialogue"><p><b>Maya:</b> Have you seen what they’re doing with the empty lot on Birch Street?</p><p><b>Jon:</b> You mean the community garden? It’s already looking <mark className="word">vibrant</mark>.</p><p><b>Maya:</b> The organisers made a deliberate effort to invite everyone. It’s become a meaningful meeting point.</p></article>
        <button className="primary inline-action" onClick={() => { markPracticeDay(); setView('words'); }}>Review vocabulary <span>→</span></button>
      </>}
      {view === 'words' && <>
        <p className="eyebrow">YOUR VOCABULARY</p><h1 className="page-title">My words</h1><p className="intro">Saved on this device · {cards.length} {cards.length === 1 ? 'word' : 'words'}</p>
        {cards.length ? cards.map((card) => <article className="word-card" key={card.word}><b>{card.word}</b></article>) : <section className="empty"><span>▱</span><b>No words saved yet</b><p>Open today’s reading and tap a highlighted word to start your collection.</p><button className="text-button" onClick={() => setView('reading')}>Go to reading practice →</button></section>}
      </>}
      {notice && <div role="status" className="notice">{notice}</div>}
      {view === 'reading' && selectionAction && <button className="selection-action" style={{ left: `clamp(72px, ${selectionAction.left}px, calc(100vw - 72px))`, top: selectionAction.top }} onPointerDown={(event) => event.preventDefault()} onClick={() => { addWord(selectionAction.word); setSelectionAction(null); window.getSelection()?.removeAllRanges(); }}>Add a word</button>}
    </main>
    <nav className="tabbar" aria-label="Main navigation">{([['home', '⌂', 'Home'], ['reading', '▤', 'Reading'], ['listening', '◖', 'Listen'], ['words', '▱', 'Words']] as const).map(([id, icon, label]) => <button key={id} className={view === id ? 'tab active' : 'tab'} onClick={() => { setView(id); if (id === 'reading') setChecked(false); }}><span>{icon}</span>{label}</button>)}</nav>
  </div>;
}
