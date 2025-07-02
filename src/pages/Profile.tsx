
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UserProfile from "@/components/profile/UserProfile";

const Profile = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <Header />
      <main className="py-8">
        <UserProfile />
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
