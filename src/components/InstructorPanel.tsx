import { useState, useEffect } from 'react';
import { Room, Question } from '../types';
import { 
  Sparkles, Clipboard, Users, Play, Check, X, ArrowRight, 
  Clock, Trophy, RotateCcw, Trash2, HelpCircle, AlertCircle, ChevronRight, Award, Link, Share2
} from 'lucide-react';

interface InstructorPanelProps {
  room: Room;
  onRefresh: () => void;
  onBackToMain: () => void;
}

export default function InstructorPanel({ room, onRefresh, onBackToMain }: InstructorPanelProps) {
  const [topic, setTopic] = useState('상식');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [includeTraps, setIncludeTraps] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'paste'>('ai');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Copy join link helper
  const handleCopyLink = () => {
    const joinUrl = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link: ', err);
    });
  };

  // Polling for room update
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh();
    }, 1500);
    return () => clearInterval(interval);
  }, [onRefresh]);

  // AI Question generation
  const handleGenerateAI = async () => {
    if (!topic.trim()) {
      setErrorMessage('주제를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/rooms/${room.code}/questions/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count, difficulty, includeTraps })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'AI 문제 생성에 실패했습니다.');
      }
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Import Questions from pasted text
  const handleImportText = async () => {
    if (!rawText.trim()) {
      setErrorMessage('불러올 텍스트를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/rooms/${room.code}/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '문제 불러오기에 실패했습니다.');
      }
      onRefresh();
      setRawText('');
    } catch (err: any) {
      setErrorMessage(err.message || '형식에 맞춰 붙여넣었는지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start the Game
  const handleStartGame = async () => {
    if (room.questions.length === 0) {
      setErrorMessage('등록된 문제가 없습니다. 문제를 먼저 등록해주세요.');
      return;
    }
    try {
      const res = await fetch(`/api/rooms/${room.code}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('게임 시작 실패');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Skip / Reveal current answer
  const handleRevealAnswer = async () => {
    try {
      await fetch(`/api/rooms/${room.code}/reveal`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Show Leaderboard
  const handleShowLeaderboard = async () => {
    try {
      await fetch(`/api/rooms/${room.code}/leaderboard`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Go to next question
  const handleNextQuestion = async () => {
    try {
      await fetch(`/api/rooms/${room.code}/next`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Reset Game / Lobby
  const handleResetGame = async () => {
    if (window.confirm('게임을 초기화하고 로비로 돌아가시겠습니까? 모든 학생 점수도 초기화됩니다.')) {
      try {
        await fetch(`/api/rooms/${room.code}/reset`, { method: 'POST' });
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Count distribution of answers
  const currentQ = room.questions[room.currentQuestionIndex];
  const oCount = room.students.filter(s => s.lastAnswer === 'O').length;
  const xCount = room.students.filter(s => s.lastAnswer === 'X').length;
  const totalSubmissions = oCount + xCount;

  return (
    <div id="instructor-container" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header id="instructor-header" className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold tracking-wider text-sm flex items-center gap-1.5">
            <span>LIVE</span>
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              강사 제어 센터 <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">Room ID: {room.code}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            id="btn-back-main"
            onClick={onBackToMain}
            className="text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-all"
          >
            방 나가기
          </button>
          {room.status !== 'lobby' && (
            <button
              id="btn-reset-game"
              onClick={handleResetGame}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-900/30 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              게임 초기화
            </button>
          )}
        </div>
      </header>

      {/* Main Panel Content depending on Room Status */}
      <main id="instructor-main" className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        
        {/* LOBBY OR SETUP STATE */}
        {room.status === 'lobby' && (
          <>
            {/* Left side: Problem setting */}
            <div id="lobby-setup-left" className="flex-1 flex flex-col gap-6">
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clipboard className="w-5 h-5 text-indigo-400" />
                  OX 퀴즈 문제 등록하기
                </h2>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                  <button
                    id="tab-ai"
                    onClick={() => { setActiveTab('ai'); setErrorMessage(''); }}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'ai' 
                        ? 'border-indigo-500 text-indigo-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    AI 자동 출제
                  </button>
                  <button
                    id="tab-paste"
                    onClick={() => { setActiveTab('paste'); setErrorMessage(''); }}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 text-center transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'paste' 
                        ? 'border-indigo-500 text-indigo-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clipboard className="w-4 h-4" />
                    시트 복사해서 붙여넣기
                  </button>
                </div>

                {/* Tab content 1: AI */}
                {activeTab === 'ai' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">퀴즈 주제</label>
                        <span className="text-[11px] text-slate-500">주제를 직접 쓰거나 아래 추천 주제를 눌러보세요</span>
                      </div>
                      <input
                        id="ai-topic-input"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="예: 한국사 상식, 대중음악 트렌드, 우주와 과학"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all mb-3"
                      />

                      {/* Topic Presets (Quick Select Tags) */}
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">추천 카테고리별 퀴즈</span>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {[
                            { label: '📚 역사/세계사', value: '역사와 세계사 기초 상식' },
                            { label: '🪐 과학/우주', value: '우주와 과학 상식' },
                            { label: '🦁 동물/자연', value: '동물과 자연 생물 상식' },
                            { label: '💻 IT/테크', value: 'IT 기술과 컴퓨터 공학 상식' },
                            { label: '🍕 음식/요리', value: '전세계 음식과 식문화 상식' },
                            { label: '⚽ 스포츠', value: '스포츠 경기 규칙 및 역사 상식' },
                            { label: '🎞️ 영화/문화', value: '영화 및 예술 대중문화 상식' },
                            { label: '🎉 넌센스', value: '초성 퀴즈 및 재미있는 넌센스 상식' },
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setTopic(preset.value)}
                              className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all truncate hover:scale-[1.02] active:scale-95 cursor-pointer ${
                                topic === preset.value
                                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">문제 수</label>
                        <select
                          id="ai-count-select"
                          value={count}
                          onChange={(e) => setCount(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                        >
                          {[3, 5, 8, 10, 15, 20].map((num) => (
                            <option key={num} value={num}>{num}문제</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">난이도</label>
                        <select
                          id="ai-difficulty-select"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                        >
                          <option value="easy">쉬움 (초등~중학생 수준)</option>
                          <option value="medium">보통 (일반 성인 상식)</option>
                          <option value="hard">어려움 (전문가 및 매니아)</option>
                        </select>
                      </div>
                    </div>

                    {/* AI Options: Trap questions */}
                    <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="text-sm font-bold text-indigo-300 cursor-pointer" htmlFor="toggle-traps">
                            학생들의 오답을 유도하는 '함정 선지' 포함
                          </label>
                          <div className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-tighter">AI Focus</div>
                        </div>
                        <p className="text-[11px] text-slate-500">일반적인 상식이나 흔히 착각하는 오개념을 활용해 변별력 있는 문제를 생성합니다.</p>
                      </div>
                      <button
                        type="button"
                        id="toggle-traps"
                        onClick={() => setIncludeTraps(!includeTraps)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${includeTraps ? 'bg-indigo-600' : 'bg-slate-800'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${includeTraps ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <button
                      id="btn-ai-generate"
                      onClick={handleGenerateAI}
                      disabled={isLoading}
                      className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Gemini AI가 문제를 출제하는 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>AI로 퀴즈 자동 생성하기</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Tab content 2: Copy Paste */}
                {activeTab === 'paste' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">스프레드시트 텍스트 복사/붙여넣기</label>
                        <span className="text-[10px] text-slate-500">구분자: 탭, 쉼표, | 지원</span>
                      </div>
                      <textarea
                        id="paste-rawtext-textarea"
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="형식: [문제문장] [탭/쉼표/|] [정답 O 또는 X] [탭/쉼표/|] [해설(선택)]&#10;예시:&#10;지구는 평평하다	X	지구는 둥근 구형입니다.&#10;빛의 속도는 소리보다 빠르다	O	빛은 우주에서 가장 빠릅니다."
                        rows={6}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>

                    <button
                      id="btn-paste-import"
                      onClick={handleImportText}
                      disabled={isLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Clipboard className="w-4 h-4" />
                      )}
                      <span>입력한 문제 가져오기</span>
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div id="setup-error-banner" className="mt-4 p-4 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Questions Preview */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-emerald-400" />
                    현재 출제 리스트 ({room.questions.length}개)
                  </h3>
                </div>

                {room.questions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                    <HelpCircle className="w-10 h-10 mb-2 stroke-1" />
                    <p className="text-sm">아직 출제된 문제가 없습니다.</p>
                    <p className="text-xs text-slate-600">위의 AI 생성 또는 붙여넣기를 통해 출제해 주세요.</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {room.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start gap-3 hover:border-slate-700 transition-all">
                        <span className="font-mono text-indigo-400 font-bold text-sm shrink-0">Q{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 font-medium truncate">{q.text}</p>
                          {q.explanation && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">해설: {q.explanation}</p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                          q.answer === 'O' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {q.answer}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Student waiting lobby */}
            <div id="lobby-setup-right" className="w-full md:w-[360px] bg-slate-950/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm flex flex-col min-h-[450px]">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-indigo-400" />
                  실시간 참여 현황
                </h3>
                <span className="bg-indigo-950 text-indigo-400 font-mono font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-900/40">
                  {room.students.length}명 대기 중
                </span>
              </div>

              {/* Invite Link and Room Code */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-center mb-6 space-y-3">
                <div>
                  <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold mb-1">학생 초대 링크</span>
                  
                  {/* Copy Link Button */}
                  <button
                    id="btn-copy-join-link"
                    onClick={handleCopyLink}
                    className={`w-full py-3 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all border ${
                      copied 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                        : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white cursor-pointer shadow hover:scale-[1.01] active:scale-95'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>초대 링크 복사 완료!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>학생 초대 링크 복사하기</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-indigo-400 block mt-2 font-medium">학생들은 코드 입력 없이 링크 클릭만으로 즉시 입장할 수 있습니다!</span>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs px-1 text-slate-500">
                  <span>Room Code:</span>
                  <span className="font-mono font-bold text-white tracking-wider">{room.code}</span>
                </div>
              </div>

              {/* Students List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[150px] max-h-[250px]">
                {room.students.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border border-dashed border-slate-800 flex items-center justify-center animate-spin mb-2">
                      <Users className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-xs">학생들이 참가하기를 기다리고 있습니다...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {room.students.map((student) => (
                      <div key={student.id} className="bg-slate-900/60 border border-slate-800 rounded-lg py-2 px-3 flex items-center justify-between animate-fadeIn text-sm">
                        <span className="font-medium text-slate-300 truncate">{student.nickname}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                id="btn-lobby-start-game"
                onClick={handleStartGame}
                disabled={room.questions.length === 0 || room.students.length === 0}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>퀴즈 게임 시작하기</span>
              </button>
              {room.students.length === 0 && room.questions.length > 0 && (
                <p className="text-[10px] text-amber-500/80 text-center mt-2">최소 한 명 이상의 학생이 들어와야 게임을 시작할 수 있습니다.</p>
              )}
            </div>
          </>
        )}

        {/* ACTIVE GAME STATE */}
        {room.status === 'active' && (
          <div id="game-active-panel" className="w-full bg-slate-950/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1.5 bg-indigo-500 transition-all duration-1000" style={{ width: `${(room.timeLeft / room.timerDuration) * 100}%` }} />

            {/* Question Info Header */}
            <div className="w-full flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
              <span className="text-indigo-400 font-bold font-mono text-sm bg-indigo-950/50 px-3.5 py-1.5 rounded-full border border-indigo-900/30">
                Question {room.currentQuestionIndex + 1} of {room.questions.length}
              </span>

              <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
                <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                <span className="text-xl">{room.timeLeft}초</span>
              </div>
            </div>

            {/* The Question Text */}
            <div className="flex-1 py-12 flex flex-col justify-center max-w-4xl">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">OX 퀴즈</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-relaxed px-4 break-keep">
                {room.questions[room.currentQuestionIndex]?.text}
              </h2>
            </div>

            {/* Answer Rate Status */}
            <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between mb-8">
              <span className="text-xs text-slate-400 font-medium">제출 인원</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">
                  {room.students.filter(s => s.lastAnswer !== null && s.lastAnswer !== undefined).length} / {room.students.length}명
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">제출 완료</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 w-full max-w-md">
              <button
                id="btn-force-reveal"
                onClick={handleRevealAnswer}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>답변 마감 및 정답 공개</span>
              </button>
            </div>
          </div>
        )}

        {/* REVEAL ANSWER STATE */}
        {room.status === 'reveal' && (
          <div id="game-reveal-panel" className="w-full bg-slate-950/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col md:flex-row gap-8 items-stretch">
            
            {/* Left side: Answer details */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400 text-sm font-semibold">Q{room.currentQuestionIndex + 1} 정답 및 해설</span>
                  <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full font-mono">정답 공개완료</span>
                </div>

                <div className="text-center py-6">
                  <span className="text-xs text-slate-500 block uppercase tracking-widest font-bold mb-2">정답</span>
                  <div className="flex justify-center items-center">
                    {room.questions[room.currentQuestionIndex]?.answer === 'O' ? (
                      <div className="w-28 h-28 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center text-emerald-400 text-6xl font-extrabold animate-bounce">
                        O
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-rose-500/10 border-4 border-rose-500 flex items-center justify-center text-rose-400 text-6xl font-extrabold animate-bounce">
                        X
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-6">
                  <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">퀴즈 문제</h4>
                  <p className="text-lg text-white font-bold leading-relaxed mb-4 break-keep">
                    {room.questions[room.currentQuestionIndex]?.text}
                  </p>
                  
                  {room.questions[room.currentQuestionIndex]?.explanation && (
                    <>
                      <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1.5 border-t border-slate-800 pt-3">해설</h4>
                      <p className="text-sm text-slate-300 leading-relaxed break-keep">
                        {room.questions[room.currentQuestionIndex]?.explanation}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-4">
                <button
                  id="btn-go-leaderboard"
                  onClick={handleShowLeaderboard}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>중간 랭킹 확인</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right side: Charts and student details */}
            <div className="w-full md:w-[380px] bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  답변 통계
                </h3>

                {/* Bar chart O vs X */}
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span>O 선택</span>
                      <span>{oCount}명 ({totalSubmissions > 0 ? Math.round((oCount / totalSubmissions) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${totalSubmissions > 0 ? (oCount / totalSubmissions) * 100 : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                      <span>X 선택</span>
                      <span>{xCount}명 ({totalSubmissions > 0 ? Math.round((xCount / totalSubmissions) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-6 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${totalSubmissions > 0 ? (xCount / totalSubmissions) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>

                {/* Submissions breakdown */}
                <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-wider flex items-center gap-2 pt-2 border-t border-slate-800">
                  <Award className="w-4 h-4 text-amber-400" />
                  학생별 정오답 현황
                </h3>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {room.students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-300 font-medium">{student.nickname}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">선택: {student.lastAnswer || '미제출'}</span>
                        {student.isCorrect ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">정답</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">오답</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center mt-4">
                정답을 맞힌 학생들은 스피드 보너스 점수가 가산되었습니다.
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD BETWEEN ROUNDS */}
        {room.status === 'leaderboard' && (
          <div id="game-leaderboard-panel" className="w-full bg-slate-950/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center">
            <div className="w-full max-w-2xl flex flex-col items-center">
              <div className="flex flex-col items-center mb-6">
                <Trophy className="w-12 h-12 text-amber-400 animate-bounce mb-2" />
                <h2 className="text-2xl font-extrabold text-white">중간 리더보드</h2>
                <p className="text-slate-400 text-xs mt-1">Q{room.currentQuestionIndex + 1} 종료 후 현재 랭킹</p>
              </div>

              {/* Top Rankings List */}
              <div className="w-full space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 mb-8 max-h-[350px] overflow-y-auto custom-scrollbar">
                {[...room.students].sort((a, b) => b.score - a.score).map((student, idx) => (
                  <div key={student.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    idx === 0 
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-200' 
                      : idx === 1 
                        ? 'bg-slate-300/10 border-slate-400/20 text-slate-200' 
                        : idx === 2 
                          ? 'bg-amber-700/10 border-amber-800/20 text-amber-400' 
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-black text-base w-6 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <span className="font-bold text-sm sm:text-base">{student.nickname}</span>
                    </div>
                    <span className="font-mono font-bold text-sm sm:text-base">{student.score} 점</span>
                  </div>
                ))}

                {room.students.length === 0 && (
                  <p className="text-slate-500 text-center py-8">참여한 학생이 없습니다.</p>
                )}
              </div>

              {/* Action Button */}
              <button
                id="btn-leaderboard-next"
                onClick={handleNextQuestion}
                className="w-full max-w-md bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {room.currentQuestionIndex + 1 < room.questions.length ? (
                  <>
                    <span>다음 문제로 진행</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span>최종 결과 발표 보기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* GAMEOVER STATE */}
        {room.status === 'gameover' && (
          <div id="game-over-panel" className="w-full bg-slate-950/40 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm flex flex-col items-center">
            <div className="w-full max-w-2xl flex flex-col items-center text-center">
              <Award className="w-16 h-16 text-yellow-400 animate-pulse mb-3" />
              <h2 className="text-3xl font-extrabold text-white mb-2">🎉 퀴즈 게임 종료! 🎉</h2>
              <p className="text-slate-400 text-sm mb-10">퀴즈에 참여한 모든 학생 여러분 수고하셨습니다!</p>

              {/* Podium Visuals */}
              {(() => {
                const sorted = [...room.students].sort((a, b) => b.score - a.score);
                const first = sorted[0];
                const second = sorted[1];
                const third = sorted[2];

                return (
                  <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-lg h-52 mb-10">
                    {/* 2nd place */}
                    {second ? (
                      <div className="flex flex-col items-center w-28 sm:w-32">
                        <span className="text-slate-300 font-bold text-sm mb-1 text-center truncate w-full">{second.nickname}</span>
                        <span className="text-[10px] text-slate-500 font-mono mb-2">{second.score}점</span>
                        <div className="bg-slate-800/80 border border-slate-700/50 w-full h-24 rounded-t-xl flex items-center justify-center flex-col shadow-inner">
                          <span className="text-2xl">🥈</span>
                          <span className="text-xs font-bold text-slate-400 uppercase mt-1">2위</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-28 sm:w-32 h-10 border-b border-dashed border-slate-800" />
                    )}

                    {/* 1st place */}
                    {first ? (
                      <div className="flex flex-col items-center w-32 sm:w-36 animate-bounce">
                        <span className="text-yellow-400 font-extrabold text-base mb-1 text-center truncate w-full">{first.nickname}</span>
                        <span className="text-xs text-yellow-500/80 font-mono mb-2">{first.score}점</span>
                        <div className="bg-gradient-to-b from-yellow-500/20 to-yellow-600/5 border-2 border-yellow-500/30 w-full h-36 rounded-t-2xl flex items-center justify-center flex-col shadow-lg">
                          <span className="text-4xl">🥇</span>
                          <span className="text-sm font-black text-yellow-400 uppercase mt-1">1위</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 sm:w-36 h-10 border-b border-dashed border-slate-800" />
                    )}

                    {/* 3rd place */}
                    {third ? (
                      <div className="flex flex-col items-center w-24 sm:w-28">
                        <span className="text-amber-600 font-bold text-xs mb-1 text-center truncate w-full">{third.nickname}</span>
                        <span className="text-[10px] text-slate-500 font-mono mb-2">{third.score}점</span>
                        <div className="bg-slate-850 border border-slate-800 w-full h-18 rounded-t-xl flex items-center justify-center flex-col shadow-inner">
                          <span className="text-xl">🥉</span>
                          <span className="text-xs font-bold text-amber-600 uppercase mt-0.5">3위</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 sm:w-28 h-10 border-b border-dashed border-slate-800" />
                    )}
                  </div>
                );
              })()}

              {/* Other scores list */}
              {room.students.length > 3 && (
                <div className="w-full text-left bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 mb-8">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">전체 학생 최종 스코어</h4>
                  <div className="grid grid-cols-2 gap-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {[...room.students].sort((a, b) => b.score - a.score).slice(3).map((student, idx) => (
                      <div key={student.id} className="flex justify-between items-center text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                        <span className="text-slate-300 font-medium truncate w-32">{idx + 4}위. {student.nickname}</span>
                        <span className="text-slate-400 font-mono">{student.score}점</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset to Lobby */}
              <button
                id="btn-gameover-reset"
                onClick={handleResetGame}
                className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>다시 처음부터 시작하기</span>
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
