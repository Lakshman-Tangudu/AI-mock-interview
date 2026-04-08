import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Outlet } from 'react-router-dom';

export default function FlowLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-12 flex items-center border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 shrink-0 sticky top-0 z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-primary/10 transition-colors duration-200 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
