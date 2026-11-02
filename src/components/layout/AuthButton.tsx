import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAdminApprovals } from '@/hooks/useAdminApprovals';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePageRefresh } from '@/hooks/usePageRefresh';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Plain <button>s, not the shared Button: its default variant paints a
// gradient background image that hides any background colour set on top of it.
const barButton =
  'flex items-center gap-2 h-8 px-3 text-xs font-medium rounded-md text-white border border-white/40 hover:bg-white/10 transition-colors';

interface AuthButtonProps {
  /** Lay the account links out as a plain list (used in the mobile menu). */
  inline?: boolean;
  onNavigate?: () => void;
}

const AuthButton = ({ inline = false, onNavigate }: AuthButtonProps) => {
  const { user, signOut, loading } = useAuth();
  const { data: isAdmin } = useAdminCheck();
  const { data: pendingApprovals } = useAdminApprovals();
  const { data: userProfile } = useUserProfile();
  const { refreshPageData } = usePageRefresh();
  const navigate = useNavigate();

  if (loading) {
    return <div className="w-20 h-8 bg-white/20 animate-pulse rounded-md" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        className={barButton}
        onClick={() => { navigate('/auth'); onNavigate?.(); }}
      >
        <User className="w-4 h-4" />
        Sign in
      </button>
    );
  }

  const pendingCount = isAdmin ? pendingApprovals?.length || 0 : 0;
  const name = userProfile?.full_name || user.email || 'Account';

  const go = (path: string) => {
    refreshPageData(path);
    navigate(path);
    onNavigate?.();
  };
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    onNavigate?.();
  };

  const countBadge = pendingCount > 0 && (
    <Badge
      variant="destructive"
      className="h-5 min-w-5 px-1 text-xs flex items-center justify-center"
    >
      {pendingCount}
    </Badge>
  );

  if (inline) {
    const row =
      'flex w-full items-center gap-2 h-8 px-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md';
    return (
      <div className="flex flex-col space-y-4">
        {isAdmin && (
          <button type="button" className={row} onClick={() => go('/admin')}>
            <LayoutDashboard className="w-4 h-4" />
            Admin dashboard
            {countBadge}
          </button>
        )}
        <button type="button" className={row} onClick={() => go('/profile')}>
          <User className="w-4 h-4" />
          Profile
        </button>
        <button type="button" className={row} onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${barButton} relative max-w-[220px]`}>
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{name}</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] leading-4 text-center text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem className="cursor-pointer" onSelect={() => go('/admin')}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Admin dashboard
            <span className="ml-auto">{countBadge}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" onSelect={() => go('/profile')}>
          <User className="w-4 h-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onSelect={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthButton;
