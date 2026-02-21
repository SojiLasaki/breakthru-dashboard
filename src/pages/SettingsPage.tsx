import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Sun, Moon, LayoutGrid, Table2, User, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, defaultView, setDefaultView } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your preferences and account settings.</p>
      </div>

      {/* Account */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user?.first_name} {user?.last_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Dark Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark themes.</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Default View</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Preferred view mode for list pages.</p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={defaultView === 'table' ? 'default' : 'outline'}
                className="gap-1.5 text-xs h-8"
                onClick={() => setDefaultView('table')}
              >
                <Table2 className="h-3.5 w-3.5" /> Table
              </Button>
              <Button
                size="sm"
                variant={defaultView === 'cards' ? 'default' : 'outline'}
                className="gap-1.5 text-xs h-8"
                onClick={() => setDefaultView('cards')}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={logout} className="gap-2">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
