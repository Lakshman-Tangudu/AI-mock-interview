import React, { createContext, useContext, useState } from 'react';
import { InterviewConfig, InterviewQuestion, InterviewSession } from '@/lib/mock-data';

interface InterviewContextType {
  config: InterviewConfig | null;
  setConfig: (c: InterviewConfig | null) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  currentSession: InterviewSession | null;
  setCurrentSession: (s: InterviewSession | null) => void;
  questions: InterviewQuestion[];
  setQuestions: (q: InterviewQuestion[]) => void;
  pendingFinalUpload: Promise<unknown> | null;
  setPendingFinalUpload: (p: Promise<unknown> | null) => void;
}

const InterviewContext = createContext<InterviewContextType>({
  config: null,
  setConfig: () => {},
  sessionId: null,
  setSessionId: () => {},
  currentSession: null,
  setCurrentSession: () => {},
  questions: [],
  setQuestions: () => {},
  pendingFinalUpload: null,
  setPendingFinalUpload: () => {},
});

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [pendingFinalUpload, setPendingFinalUpload] = useState<Promise<unknown> | null>(null);

  return (
    <InterviewContext.Provider value={{
      config,
      setConfig,
      sessionId,
      setSessionId,
      currentSession,
      setCurrentSession,
      questions,
      setQuestions,
      pendingFinalUpload,
      setPendingFinalUpload,
    }}>
      {children}
    </InterviewContext.Provider>
  );
}

export const useInterview = () => useContext(InterviewContext);
