import { useState, useEffect, useRef } from 'react';
import { Room, Student } from '../types';
import { 
  Check, X, Clock, Award, Users, AlertCircle, LogOut, ArrowRight, Star
} from 'lucide-react';

interface StudentPanelProps {
  roomCode: string;
  studentId: string;
  onLeave: () => void;
}

export default function StudentPanel({ roomCode, studentId, onLeave }: StudentPanelProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [lastQuestionIdx, setLastQuestionIdx] = useState<number>(-1);

  // Poll room updates
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('방이 폭파되었거나 존재하지 않습니다.');
          }
          throw new Error('방 정보를 가져오는데 실패했습니다.');
        }
        const updatedRoom: Room = await res.json();
        setRoom(updatedRoom);

        // Synchronize student data
        const currentStudent = updatedRoom.students.find(s => s.id === studentId);
        if (!currentStudent) {
          throw new Error('강사님에 의해 퇴장 조치되었거나 연결이 유실되었습니다.');
        }
        setStudent(currentStudent);

        // Keep track of question start time for speed score bonus
        if (updatedRoom.status === 'active' && updatedRoom.currentQuestionIndex !== lastQuestionIdx) {
          setQuestionStartTime(Date.now());
          setLastQuestionIdx(updatedRoom.currentQuestionIndex);
        }
        setErrorMsg('');
      } catch (err: any) {
        setErrorMsg(err.message || '서버와의 통신 오류가 발생했습니다.');
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 1000); // Poll every 1s for real-time response
    return () => clearInterval(interval);
  }, [roomCode, studentId, lastQuestionIdx]);

  // Submit Answer (O or X)
  const handleAnswerSubmit = async (selectedAnswer: 'O' | 'X') => {
    if (isSubmitting || !room || !student) return;
    setIsSubmitting(true);

    const timeSpent = questionStartTime ? (Date.now() - questionStartTime) : 0;

    try {
      const res = await fetch(`/api/rooms/${roomCode}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          answer: selectedAnswer,
          timeSpent,
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '답변 제출 실패');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (errorMsg && !room) {
    return (
      <div id="student-error-state" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">접속이 해제되었습니다</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
          <button
            id="btn-error-leave"
            onClick={onLeave}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer"
          >
            메인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!room || !student) {
    return (
      <div id="student-loading-state" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">퀴즈 대기방에 접속하는 중...</p>
        </div>
      </div>
    );
  }

  const currentQ = room.questions[room.currentQuestionIndex];
  const hasAnswered = student.lastAnswer !== null && student.lastAnswer !== undefined;

  return (
    <div id="student-panel" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <header id="student-header" className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            실시간 퀴즈 참여 중
          </div>
          <span className="text-sm font-bold text-slate-300">
            {student.nickname} <span className="text-xs text-slate-500 font-normal">학생</span>
          </span>
        </div>

        <button
          id="btn-student-leave"
          onClick={() => {
            if (window.confirm('정말 퀴즈 방에서 퇴장하시겠습니까? 진행 중인 기록이 삭제됩니다.')) {
              onLeave();
            }
          }}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 bg-slate-800/50 hover:bg-rose-950/20 px-2.5 py-1.5 rounded-lg border border-slate-700/50 hover:border-rose-900/40 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          나가기
        </button>
      </header>

      {/* Main Container */}
      <main id="student-main" className="flex-1 max-w-lg w-full mx-auto p-5 flex flex-col justify-center">

        {/* LOBBY STATE */}
        {room.status === 'lobby' && (
          <div id="student-lobby" className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm animate-fadeIn">
            <div className="w-16 h-16 bg-indigo-600/10 border-2 border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-black text-white mb-2">대기실 입장 완료</h2>
            <p className="text-sm text-slate-400 mb-6">강사님이 게임을 시작하기를 기다리고 있습니다.</p>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-4">
              <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">나의 닉네임</span>
              <span className="text-lg font-bold text-indigo-400">{student.nickname}</span>
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>실시간 동기화 활성화됨</span>
            </div>
          </div>
        )}

        {/* ACTIVE QUESTION STATE */}
        {room.status === 'active' && (
          <div id="student-active" className="flex flex-col gap-6 animate-fadeIn">
            
            {/* Round info & Timer */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/50 px-2.5 py-1 rounded border border-indigo-900/30">
                Q {room.currentQuestionIndex + 1}
              </span>

              <div className="flex items-center gap-2 font-mono text-amber-400 font-bold">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>{room.timeLeft}초 남음</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 text-center">
              <p className="text-base text-white font-extrabold leading-relaxed break-keep">
                {currentQ?.text}
              </p>
            </div>

            {/* Answer choice buttons */}
            {!hasAnswered ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  id="btn-answer-o"
                  onClick={() => handleAnswerSubmit('O')}
                  disabled={isSubmitting}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border-2 border-emerald-500/40 text-emerald-400 font-black text-6xl h-44 rounded-3xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg hover:border-emerald-500"
                >
                  O
                  <span className="text-xs font-semibold uppercase tracking-wider">True</span>
                </button>

                <button
                  id="btn-answer-x"
                  onClick={() => handleAnswerSubmit('X')}
                  disabled={isSubmitting}
                  className="bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border-2 border-rose-500/40 text-rose-400 font-black text-6xl h-44 rounded-3xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer shadow-lg hover:border-rose-500"
                >
                  X
                  <span className="text-xs font-semibold uppercase tracking-wider">False</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center">
                <span className="text-xs text-slate-500 block uppercase tracking-wider mb-2">답변 제출 완료</span>
                
                <div className="flex justify-center mb-4">
                  {student.lastAnswer === 'O' ? (
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-3xl font-extrabold">O</div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-rose-400 text-3xl font-extrabold">X</div>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-300">답변을 마감하는 중입니다...</p>
                <p className="text-xs text-slate-500 mt-1">다른 학생들의 답변을 기다리는 동안 잠시 대기하세요.</p>
              </div>
            )}
          </div>
        )}

        {/* REVEAL STATE (AFTER QUESTION) */}
        {room.status === 'reveal' && (
          <div id="student-reveal" className="flex flex-col gap-6 animate-fadeIn">
            
            {/* Verdict Splash Card */}
            <div className={`border rounded-2xl p-8 text-center overflow-hidden relative ${
              student.isCorrect 
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
            }`}>
              {student.isCorrect ? (
                <>
                  <div className="absolute top-2 right-2 animate-spin duration-3000 opacity-20"><Star className="w-16 h-16" /></div>
                  <Check className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
                  <h2 className="text-2xl font-black text-emerald-400">정답입니다! 🎉</h2>
                  <p className="text-sm text-emerald-500/80 mt-1">훌륭합니다! 점수가 적립되었습니다.</p>
                </>
              ) : (
                <>
                  <X className="w-16 h-16 text-rose-400 mx-auto mb-4 animate-shake" />
                  <h2 className="text-2xl font-black text-rose-400">오답입니다 😢</h2>
                  <p className="text-sm text-rose-500/80 mt-1">아쉽네요! 다음 문제를 노려보세요.</p>
                </>
              )}
            </div>

            {/* Answer explanation card */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
              <span className="text-xs text-slate-500 block uppercase tracking-wider mb-2">정답 해설</span>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs text-slate-400">Q{room.currentQuestionIndex + 1} 정답:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                  currentQ?.answer === 'O' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {currentQ?.answer}
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed break-keep">
                {currentQ?.explanation || '해설이 별도로 준비되지 않은 문제입니다.'}
              </p>
            </div>

            {/* Student Score Display */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400">나의 총 점수</span>
              </div>
              <span className="text-base font-bold text-white font-mono">{student.score} 점</span>
            </div>

            <p className="text-xs text-slate-500 text-center animate-pulse">강사님이 다음 랭킹 페이지로 넘어갈 때까지 기다리는 중...</p>
          </div>
        )}

        {/* LEADERBOARD STATE */}
        {room.status === 'leaderboard' && (
          <div id="student-leaderboard" className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm animate-fadeIn">
            <Award className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-2">현재 리더보드 집계 중</h2>
            <p className="text-sm text-slate-400 mb-6">강사 화면에 떠오른 중간 순위를 확인해 보세요!</p>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-4">
              <span className="text-xs text-slate-500 block uppercase tracking-wider mb-1">나의 랭킹 정보</span>
              <div className="flex justify-between items-center mt-2 px-4">
                <div>
                  <span className="text-xs text-slate-400 block">내 점수</span>
                  <span className="text-lg font-bold text-white font-mono">{student.score}점</span>
                </div>
                <div className="border-l border-slate-800 h-8" />
                <div>
                  <span className="text-xs text-slate-400 block">현재 등수</span>
                  <span className="text-lg font-bold text-indigo-400 font-mono">
                    {(() => {
                      const sorted = [...room.students].sort((a, b) => b.score - a.score);
                      const myRankIdx = sorted.findIndex(s => s.id === studentId);
                      return myRankIdx !== -1 ? `${myRankIdx + 1}위` : '-';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 animate-pulse">다음 문제로 진행할 때까지 대기하세요.</p>
          </div>
        )}

        {/* GAMEOVER STATE */}
        {room.status === 'gameover' && (
          <div id="student-gameover" className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm animate-fadeIn">
            <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-black text-white mb-1">퀴즈 게임 완료!</h2>
            <p className="text-sm text-slate-400 mb-8">모든 질문에 응답을 완료했습니다.</p>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">최종 랭킹</span>
                <span className="text-xl font-bold text-indigo-400">
                  {(() => {
                    const sorted = [...room.students].sort((a, b) => b.score - a.score);
                    const myRankIdx = sorted.findIndex(s => s.id === studentId);
                    return myRankIdx !== -1 ? `${myRankIdx + 1}위 / ${sorted.length}명` : '-';
                  })()}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                <span className="text-sm text-slate-400">획득 점수</span>
                <span className="text-xl font-extrabold text-white font-mono">{student.score}점</span>
              </div>
            </div>

            <button
              id="btn-student-gameover-exit"
              onClick={onLeave}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>메인 화면으로 나가기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
