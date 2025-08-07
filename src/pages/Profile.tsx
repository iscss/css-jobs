
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UserProfile from "@/components/profile/UserProfile";
import UserDashboard from "@/components/profile/UserDashboard";
import MyJobPosts from "@/components/profile/MyJobPosts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

const Profile = () => {
  const { data: userProfile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Determine if user can see job posts tab
  const canSeeJobPosts = userProfile?.user_type === 'job_poster';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'profile', 'my-jobs'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content py-8">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${canSeeJobPosts ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
              {canSeeJobPosts && (
                <TabsTrigger value="my-jobs">My Job Posts</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="dashboard">
              <UserDashboard />
            </TabsContent>

            <TabsContent value="profile">
              <UserProfile />
            </TabsContent>

            {canSeeJobPosts && (
              <TabsContent value="my-jobs">
                <MyJobPosts />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
