import { useState } from "react";
import { useJobAlerts, useCreateJobAlert, useDeleteJobAlert } from "@/hooks/useJobAlerts";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Trash2, Edit, AlertCircle, Settings, Clock, Mail } from "lucide-react";

const JobAlerts = () => {
  const { data: jobAlerts, isLoading: alertsLoading } = useJobAlerts();
  const { data: notificationSettings, isLoading: settingsLoading } = useNotificationSettings();
  const createAlert = useCreateJobAlert();
  const deleteAlert = useDeleteJobAlert();
  const updateSettings = useUpdateNotificationSettings();
  const [newAlert, setNewAlert] = useState({ keywords: "", location: "" });
  const [editingAlert, setEditingAlert] = useState<string | null>(null);

  // Enhanced notification preferences (stored in component state since schema can't be modified)
  const [deadlinePreferences, setDeadlinePreferences] = useState({
    daysBeforeDeadline: "3",
    timeOfDay: "morning",
    multipleReminders: false,
    emailFrequency: "immediate"
  });

  const handleUpdateNotification = (setting: string, value: boolean) => {
    updateSettings.mutate({ [setting]: value });
  };

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

  return (
    <div className="space-y-6">
      {/* Job Alerts Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Job Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Email notifications coming soon!</strong> You can set up job alerts now, and we'll track matching jobs for you.
            </AlertDescription>
          </Alert>

          {/* Create New Alert Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <h3 className="font-semibold">Create New Job Alert</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alert-keywords">Keywords</Label>
                <Input
                  id="alert-keywords"
                  placeholder="e.g., machine learning, computational social science"
                  value={newAlert.keywords}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, keywords: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-location">Location</Label>
                <Input
                  id="alert-location"
                  placeholder="e.g., Remote, New York, Europe"
                  value={newAlert.location}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={handleCreateAlert}
              disabled={createAlert.isPending || (!newAlert.keywords && !newAlert.location)}
              className="w-full"
            >
              {createAlert.isPending ? "Creating..." : "Create Alert"}
            </Button>
          </div>

          {/* Active Alerts Section */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              Active Alerts ({jobAlerts?.length || 0})
            </h3>
            {alertsLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : jobAlerts && jobAlerts.length > 0 ? (
              <div className="space-y-3">
                {jobAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {alert.keywords && (
                          <Badge variant="secondary">
                            Keywords: {alert.keywords}
                          </Badge>
                        )}
                        {alert.location && (
                          <Badge variant="outline">
                            Location: {alert.location}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAlert(editingAlert === alert.id ? null : alert.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAlert(alert.id)}
                        disabled={deleteAlert.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No active job alerts</p>
                <p className="text-sm">Create your first alert to start tracking opportunities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
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
            <div className="space-y-6">
              {/* Job Alert Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <h4 className="font-medium">Job Alert Notifications</h4>
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">New Job Notifications</h5>
                    <p className="text-sm text-muted-foreground">Get notified when new jobs match your alerts</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.new_jobs || false}
                    onCheckedChange={(checked) => handleUpdateNotification('new_jobs', checked)}
                  />
                </div>

                {notificationSettings?.new_jobs && (
                  <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                    <div className="space-y-2">
                      <Label>Email Frequency</Label>
                      <Select value={deadlinePreferences.emailFrequency} onValueChange={(value) =>
                        setDeadlinePreferences(prev => ({ ...prev, emailFrequency: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediately (as jobs are posted)</SelectItem>
                          <SelectItem value="daily">Daily digest</SelectItem>
                          <SelectItem value="weekly">Weekly summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Deadline Reminders */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-medium">Deadline Reminders</h4>
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium">Application Deadline Reminders</h5>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming application deadlines</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.deadline_reminders || false}
                    onCheckedChange={(checked) => handleUpdateNotification('deadline_reminders', checked)}
                  />
                </div>

                {notificationSettings?.deadline_reminders && (
                  <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Remind me</Label>
                        <Select value={deadlinePreferences.daysBeforeDeadline} onValueChange={(value) =>
                          setDeadlinePreferences(prev => ({ ...prev, daysBeforeDeadline: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 day before</SelectItem>
                            <SelectItem value="3">3 days before</SelectItem>
                            <SelectItem value="7">1 week before</SelectItem>
                            <SelectItem value="14">2 weeks before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Preferred time</Label>
                        <Select value={deadlinePreferences.timeOfDay} onValueChange={(value) =>
                          setDeadlinePreferences(prev => ({ ...prev, timeOfDay: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning (9 AM)</SelectItem>
                            <SelectItem value="afternoon">Afternoon (2 PM)</SelectItem>
                            <SelectItem value="evening">Evening (6 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="font-medium">Multiple reminders</h6>
                        <p className="text-sm text-muted-foreground">Send additional reminder 1 day before deadline</p>
                      </div>
                      <Switch
                        checked={deadlinePreferences.multipleReminders}
                        onCheckedChange={(checked) =>
                          setDeadlinePreferences(prev => ({ ...prev, multipleReminders: checked }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Weekly Digest */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    Weekly Digest
                    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground">Weekly summary of new opportunities and saved jobs</p>
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
    </div>
  );
};

export default JobAlerts;