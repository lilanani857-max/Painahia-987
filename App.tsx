import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from './components/ProtectedRoute';
import './lib/auth'; // Initialize token getter

// Pages
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminOrganizerRequests from './pages/admin/OrganizerRequests';
import AdminGames from './pages/admin/Games';
import AdminStats from './pages/admin/Stats';
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerGames from './pages/organizer/Games';
import OrganizerCreateGame from './pages/organizer/CreateGame';
import OrganizerGameRoom from './pages/organizer/GameRoom';
import PlayerDashboard from './pages/player/Dashboard';
import PlayerGames from './pages/player/Games';
import PlayerGameRoom from './pages/player/GameRoom';
import PlayerCards from './pages/player/Cards';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      
      <ProtectedRoute path="/profile" component={Profile} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" role="admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/users" role="admin" component={AdminUsers} />
      <ProtectedRoute path="/admin/organizer-requests" role="admin" component={AdminOrganizerRequests} />
      <ProtectedRoute path="/admin/games" role="admin" component={AdminGames} />
      <ProtectedRoute path="/admin/stats" role="admin" component={AdminStats} />

      {/* Organizer Routes */}
      <ProtectedRoute path="/organizer" role="organizer" component={OrganizerDashboard} />
      <ProtectedRoute path="/organizer/games" role="organizer" component={OrganizerGames} />
      <ProtectedRoute path="/organizer/games/new" role="organizer" component={OrganizerCreateGame} />
      <ProtectedRoute path="/organizer/games/:id" role="organizer" component={OrganizerGameRoom} />

      {/* Player Routes */}
      <ProtectedRoute path="/player" role="player" component={PlayerDashboard} />
      <ProtectedRoute path="/player/games" role="player" component={PlayerGames} />
      <ProtectedRoute path="/player/games/:id" role="player" component={PlayerGameRoom} />
      <ProtectedRoute path="/player/cards" role="player" component={PlayerCards} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
