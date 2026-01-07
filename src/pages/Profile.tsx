
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UserProfile from "@/components/profile/UserProfile";
import MyJobPosts from "@/components/profile/MyJobPosts";
import SavedJobs from "@/components/profile/SavedJobs";
import JobAlerts from "@/components/profile/JobAlerts";
import { PendingApprovalBanner } from "@/components/profile/PendingApprovalBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bookmark, Bell, User, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const { data: userProfile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("saved-jobs");

  // Determine if user can see job posts tab
  const canSeeJobPosts = userProfile?.is_approved_poster || userProfile?.user_type === 'job_poster';

  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['saved-jobs', 'profile-settings'];
    if (canSeeJobPosts) validTabs.push('my-jobs');
    // Remove 'alerts' from valid tabs since it's disabled

    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, canSeeJobPosts]);

  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {userProfile?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground">
              Manage your job applications and stay updated with new opportunities
            </p>
          </div>

          {userProfile?.user_type === 'job_poster' &&
           userProfile?.approval_status === 'pending' &&
           !userProfile?.is_approved_poster &&
           userProfile?.email && (
            <div className="mb-6">
              <PendingApprovalBanner userEmail={userProfile.email} />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${canSeeJobPosts ? 'grid-cols-4' : 'grid-cols-3'} bg-muted/30 p-1 rounded-xl gap-0.5 h-auto`}>
              <TabsTrigger
                value="saved-jobs"
                className="flex items-center gap-2 font-medium text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=active]:rounded-lg hover:bg-white/50 hover:rounded-lg py-2.5 px-3 text-muted-foreground"
              >
                <Bookmark className="w-4 h-4" />
                Saved Jobs
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="flex items-center gap-2 font-medium text-sm py-2.5 px-3 opacity-40 cursor-not-allowed bg-muted/20 text-muted-foreground rounded-lg relative transition-all duration-300"
                disabled
              >
                <Bell className="w-4 h-4" />
                Job Alerts
                <Badge variant="secondary" className="text-xs ml-1 bg-muted/40 text-muted-foreground border-0">
                  Coming Soon
                </Badge>
              </TabsTrigger>
              {canSeeJobPosts && (
                <TabsTrigger
                  value="my-jobs"
                  className="flex items-center gap-2 font-medium text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=active]:rounded-lg hover:bg-white/50 hover:rounded-lg py-2.5 px-3 text-muted-foreground"
                >
                  <Briefcase className="w-4 h-4" />
                  My Job Posts
                </TabsTrigger>
              )}
              <TabsTrigger
                value="profile-settings"
                className="flex items-center gap-2 font-medium text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=active]:rounded-lg hover:bg-white/50 hover:rounded-lg py-2.5 px-3 text-muted-foreground"
              >
                <User className="w-4 h-4" />
                Profile Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved-jobs">
              <SavedJobs />
            </TabsContent>

            <TabsContent value="alerts">
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                  Job Alerts Coming Soon
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're working on an amazing job alerts feature that will notify you when new opportunities match your interests. Stay tuned!
                </p>
              </div>
            </TabsContent>

            {canSeeJobPosts && (
              <TabsContent value="my-jobs">
                <MyJobPosts />
              </TabsContent>
            )}

            <TabsContent value="profile-settings">
              <UserProfile />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
