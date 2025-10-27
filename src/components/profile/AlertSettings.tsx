import { useState } from "react";
import { useNotificationSettings, useUpdateNotificationSettings } from "@/hooks/useNotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Clock, Mail, AlertCircle } from "lucide-react";

const AlertSettings = () => {
  const { data: notificationSettings, isLoading: settingsLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Email notifications coming soon!</strong> Configure your preferences now and they'll be applied when email functionality is ready.
          </AlertDescription>
        </Alert>

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
  );
};

export default AlertSettings;