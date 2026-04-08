-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  interview_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  config JSONB,
  overall_score NUMERIC(3,1) DEFAULT 0,
  feedback JSONB,
  responses JSONB,
  status VARCHAR(50) DEFAULT 'completed'
);

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_id VARCHAR(50),
  user_response TEXT,
  score NUMERIC(3,1) DEFAULT 0,
  feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at DESC);
CREATE INDEX idx_interview_questions_session_id ON interview_questions(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only see their own sessions" 
ON interview_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON interview_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON interview_sessions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see questions from their sessions" 
ON interview_questions FOR SELECT 
USING (session_id IN (
  SELECT id FROM interview_sessions WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert questions in their sessions" 
ON interview_questions FOR INSERT 
WITH CHECK (session_id IN (
  SELECT id FROM interview_sessions WHERE user_id = auth.uid()
));
