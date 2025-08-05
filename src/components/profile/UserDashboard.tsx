import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Bookmark, Search, Filter, Settings } from "lucide-react";

const UserDashboard = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState({
    newJobs: true,
    deadlineReminders: true,
    weeklyDigest: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {profile?.full_name || user?.email}
        </h1>
        <p className="text-muted-foreground">
          Manage your job applications and stay updated with new opportunities
        </p>
      </div>

      <Tabs defaultValue="saved" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            Saved Jobs
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Job Alerts
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                Saved Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search saved jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center py-12 text-muted-foreground">
                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No saved jobs yet</p>
                <p>Start browsing jobs and save the ones you're interested in!</p>
                <Button variant="outline" className="mt-4">
                  Browse Jobs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Job Alerts & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Create New Alert</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Keywords (e.g., machine learning)" />
                  <Input placeholder="Location (e.g., Remote)" />
                </div>
                <Button className="w-full">Create Alert</Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Active Alerts</h3>
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active job alerts</p>
                  <p className="text-sm">Create your first alert to get notified about new opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">New Job Notifications</h4>
                    <p className="text-sm text-muted-foreground">Get notified when new jobs match your alerts</p>
                  </div>
                  <Badge variant={notifications.newJobs ? "default" : "outline"}>
                    {notifications.newJobs ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Deadline Reminders</h4>
                    <p className="text-sm text-muted-foreground">Get reminded about application deadlines</p>
                  </div>
                  <Badge variant={notifications.deadlineReminders ? "default" : "outline"}>
                    {notifications.deadlineReminders ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Digest</h4>
                    <p className="text-sm text-muted-foreground">Weekly summary of new opportunities</p>
                  </div>
                  <Badge variant={notifications.weeklyDigest ? "default" : "outline"}>
                    {notifications.weeklyDigest ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;