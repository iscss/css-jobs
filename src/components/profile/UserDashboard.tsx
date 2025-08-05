import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useJobAlerts, useCreateJobAlert, useDeleteJobAlert } from "@/hooks/useJobAlerts";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Bell, Bookmark, Search, Filter, Settings, X, Plus, Trash2 } from "lucide-react";
import CompactJobCard from "@/components/jobs/CompactJobCard";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";

const UserDashboard = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const { data: savedJobs, isLoading: savedJobsLoading } = useSavedJobs();
  const { data: jobAlerts, isLoading: alertsLoading } = useJobAlerts();
  const { data: notificationSettings, isLoading: settingsLoading } = useNotificationSettings();
  const createAlert = useCreateJobAlert();
  const deleteAlert = useDeleteJobAlert();
  const updateSettings = useUpdateNotificationSettings();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [newAlert, setNewAlert] = useState({ keywords: "", location: "" });

  const handleCreateAlert = () => {
    if (newAlert.keywords || newAlert.location) {
      createAlert.mutate({
        keywords: newAlert.keywords || null,
        location: newAlert.location || null,
      });
      setNewAlert({ keywords: "", location: "" });
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    deleteAlert.mutate(alertId);
  };

  const handleUpdateNotification = (setting: string, value: boolean) => {
    updateSettings.mutate({ [setting]: value });
  };

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
    <>
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
                
                {savedJobsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-32" />
                    ))}
                  </div>
                ) : savedJobs && savedJobs.length > 0 ? (
                  <div className="space-y-4">
                    {savedJobs
                      .filter((savedJob: any) => 
                        !searchTerm || 
                        savedJob.jobs?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        savedJob.jobs?.institution?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((savedJob: any) => (
                        <CompactJobCard
                          key={savedJob.id}
                          job={savedJob.jobs}
                          onViewDetails={setSelectedJob}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No saved jobs yet</p>
                    <p>Start browsing jobs and save the ones you're interested in!</p>
                    <Button variant="outline" className="mt-4">
                      Browse Jobs
                    </Button>
                  </div>
                )}
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
                    <Input 
                      placeholder="Keywords (e.g., machine learning)" 
                      value={newAlert.keywords}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, keywords: e.target.value }))}
                    />
                    <Input 
                      placeholder="Location (e.g., Remote)" 
                      value={newAlert.location}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateAlert}
                    disabled={createAlert.isPending || (!newAlert.keywords && !newAlert.location)}
                    className="w-full"
                  >
                    {createAlert.isPending ? "Creating..." : "Create Alert"}
                  </Button>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Active Alerts</h3>
                  {alertsLoading ? (
                    <div className="space-y-2">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : jobAlerts && jobAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {jobAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {alert.keywords && `Keywords: ${alert.keywords}`}
                              {alert.keywords && alert.location && " • "}
                              {alert.location && `Location: ${alert.location}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(alert.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            disabled={deleteAlert.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No active job alerts</p>
                      <p className="text-sm">Create your first alert to get notified about new opportunities</p>
                    </div>
                  )}
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
                {settingsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">New Job Notifications</h4>
                        <p className="text-sm text-muted-foreground">Get notified when new jobs match your alerts</p>
                      </div>
                      <Switch
                        checked={notificationSettings?.new_jobs || false}
                        onCheckedChange={(checked) => handleUpdateNotification('new_jobs', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Deadline Reminders</h4>
                        <p className="text-sm text-muted-foreground">Get reminded about application deadlines</p>
                      </div>
                      <Switch
                        checked={notificationSettings?.deadline_reminders || false}
                        onCheckedChange={(checked) => handleUpdateNotification('deadline_reminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Weekly Digest</h4>
                        <p className="text-sm text-muted-foreground">Weekly summary of new opportunities</p>
                      </div>
                      <Switch
                        checked={notificationSettings?.weekly_digest || false}
                        onCheckedChange={(checked) => handleUpdateNotification('weekly_digest', checked)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  );
};

export default UserDashboard;