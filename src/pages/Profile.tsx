
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UserProfile from "@/components/profile/UserProfile";
import UserDashboard from "@/components/profile/UserDashboard";
import MyJobPosts from "@/components/profile/MyJobPosts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="profile">Profile Settings</TabsTrigger>
              <TabsTrigger value="my-jobs">My Job Posts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <UserDashboard />
            </TabsContent>
            
            <TabsContent value="profile">
              <UserProfile />
            </TabsContent>
            
            <TabsContent value="my-jobs">
              <MyJobPosts />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
