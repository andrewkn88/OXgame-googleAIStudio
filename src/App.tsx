import React, { useState, useEffect } from 'react';
import InstructorPanel from './components/InstructorPanel';
import StudentPanel from './components/StudentPanel';
import { Room } from './types';
import { Sparkles, Users, Award, Play, AlertCircle } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'select' | 'instructor' | 'student'>('select');
  
  // Student Join State
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasRoomParam, setHasRoomParam] = useState(false);
  
  // Active states
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Check query parameter on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.trim());
      setHasRoomParam(true);
    }
  }, []);

  // 1. Create a new Room (Instructor)
  const handleCreateRoom = async () => {
    setErrorMessage('');
    setIsJoining(true);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      if (!res.ok) throw new Error('방 만들기에 실패했습니다.');
      const room: Room = await res.json();
      setActiveRoom(room);
      setRole('instructor');
    } catch (err: any) {
      setErrorMessage(err.message || '오류가 발생했습니다.');
    } finally {
      setIsJoining(false);
    }
  };

  // 2. Poll/Refresh active room details (Instructor side)
  const handleRefreshInstructorRoom = async () => {
    if (!activeRoom) return;
    try {
      const res = await fetch(`/api/rooms/${activeRoom.code}`);
      if (res.ok) {
        const room: Room = await res.json();
        setActiveRoom(room);
      }
    } catch (err) {
      console.error("Error refreshing room status:", err);
    }
  };

  // 3. Join existing Room (Student)
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !nickname.trim()) {
      setErrorMessage('방 번호와 닉네임을 모두 입력해 주세요.');
      return;
    }
    
    setErrorMessage('');
    setIsJoining(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '방 참가에 실패했습니다.');
      }
      
      const { student, room } = await res.json();
      setActiveRoom(room);
      setActiveStudentId(student.id);
      setRole('student');
    } catch (err: any) {
      setErrorMessage(err.message || '방이 없거나 이미 사용 중인 닉네임입니다.');
    } finally {
      setIsJoining(false);
    }
  };

  // 4. Return back to lobby/role selection
  const handleBackToMain = () => {
    setRole('select');
    setActiveRoom(null);
    setActiveStudentId(null);
    setRoomCode('');
    setNickname('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      
      {/* 1. SELECT ROLE / ENTRY SCREEN */}
      {role === 'select' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

          <div className="max-w-md w-full text-center">
            {/* Logo area */}
            <div className="mb-8 inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/80 border border-indigo-900/30 rounded-full text-xs text-indigo-400 font-semibold animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
              <span>실시간 양방향 OX 퀴즈 플랫폼</span>
            </div>
            
            <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl mb-3">
              실시간 OX 퀴즈!
            </h1>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-10">
              AI를 통한 즉석 퀴즈 출제부터 시트 복사까지, 강사와 학생이 실시간으로 소통하며 즐기는 스마트 퀴즈 게임
            </p>

            <div className="space-y-4">
              {/* Join as Student Card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/80 transition-all text-left">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  학생으로 참가하기
                </h3>

                <form onSubmit={handleJoinRoom} className="space-y-4">
                  {hasRoomParam ? (
                    <div className="space-y-3">
                      <div className="bg-indigo-950/40 border border-indigo-900/30 rounded-xl px-4 py-3.5 flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-indigo-300 font-semibold">초대 링크를 통해 퀴즈에 참여합니다</span>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">게임에서 사용할 닉네임</label>
                        <input
                          id="nickname-input"
                          type="text"
                          maxLength={12}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          placeholder="닉네임 입력 (최대 12자)"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        id="room-code-input"
                        type="text"
                        maxLength={4}
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Room Code (4자리)"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all text-center font-mono tracking-widest font-bold"
                      />
                      <input
                        id="nickname-input"
                        type="text"
                        maxLength={12}
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임 입력"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  )}

                  <button
                    id="btn-join-room"
                    type="submit"
                    disabled={isJoining}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isJoining ? '참가하는 중...' : '퀴즈 방 참여하기'}
                  </button>

                  {hasRoomParam && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasRoomParam(false);
                        setRoomCode('');
                      }}
                      className="w-full text-center text-[11px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
                    >
                      다른 방 번호 직접 입력하기
                    </button>
                  )}
                </form>
              </div>

              {/* Or Instructor Card */}
              {!hasRoomParam && (
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-5 hover:border-slate-800 transition-all flex items-center justify-between text-left">
                  <div className="flex-1 pr-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                      <Award className="w-4 h-4 text-emerald-400" />
                      강사 모드로 시작
                    </h3>
                    <p className="text-xs text-slate-500">방을 개설하고 AI 출제 및 참여자를 제어합니다.</p>
                  </div>
                  
                  <button
                    id="btn-create-room"
                    onClick={handleCreateRoom}
                    disabled={isJoining}
                    className="bg-slate-800 hover:bg-slate-700/80 text-white font-bold py-2.5 px-4 rounded-xl border border-slate-700/40 text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    방 만들기
                  </button>
                </div>
              )}
            </div>

            {/* General Error Banner */}
            {errorMessage && (
              <div id="main-error-banner" className="mt-5 p-3.5 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl text-xs flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INSTRUCTOR VIEW PANEL */}
      {role === 'instructor' && activeRoom && (
        <InstructorPanel 
          room={activeRoom} 
          onRefresh={handleRefreshInstructorRoom} 
          onBackToMain={handleBackToMain} 
        />
      )}

      {/* 3. STUDENT VIEW PANEL */}
      {role === 'student' && activeRoom && activeStudentId && (
        <StudentPanel 
          roomCode={activeRoom.code} 
          studentId={activeStudentId} 
          onLeave={handleBackToMain} 
        />
      )}

      {/* Small Footer */}
      {role === 'select' && (
        <footer className="text-center py-6 border-t border-slate-900">
          <p className="text-[10px] text-slate-600">© 2026 실시간 OX 퀴즈 플랫폼 • Powered by Gemini AI</p>
        </footer>
      )}
    </div>
  );
}
