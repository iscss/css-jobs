import { useAllUsers } from "@/hooks/useUserManagement";
import { useAllJobs } from "@/hooks/useJobManagement";
import { useAdminApprovals } from "@/hooks/useAdminApprovals";
import { Users, Briefcase, Clock, CheckCircle, XCircle, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminStats = () => {
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: jobs, isLoading: jobsLoading } = useAllJobs();
  const { data: pendingApprovals, isLoading: approvalsLoading } = useAdminApprovals();

  const jobSeekers = users?.filter(user => user.user_type === 'job_seeker') || [];
  const jobPosters = users?.filter(user => user.user_type === 'job_poster') || [];
  
  const approvedPosters = users?.filter(user => user.is_approved_poster) || [];
  const adminUsers = users?.filter(user => user.is_admin) || [];
  const publishedJobs = jobs?.filter(job => job.is_published) || [];
  const unpublishedJobs = jobs?.filter(job => !job.is_published) || [];
  const featuredJobs = jobs?.filter(job => job.is_featured) || [];

  const userStats = [
    {
      title: "Total Users",
      value: usersLoading ? "..." : users?.length || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Job Seekers",
      value: usersLoading ? "..." : jobSeekers.length,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Job Posters",
      value: usersLoading ? "..." : jobPosters.length,
      icon: UserCheck,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      title: "Pending Approvals",
      value: approvalsLoading ? "..." : pendingApprovals?.length || 0,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Approved Posters",
      value: usersLoading ? "..." : approvedPosters.length,
      icon: UserCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
  ];

  const jobStats = [
    {
      title: "Total Jobs",
      value: jobsLoading ? "..." : jobs?.length || 0,
      icon: Briefcase,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Published Jobs",
      value: jobsLoading ? "..." : publishedJobs.length,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Draft Jobs",
      value: jobsLoading ? "..." : unpublishedJobs.length,
      icon: XCircle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Featured Jobs",
      value: jobsLoading ? "..." : featuredJobs.length,
      icon: CheckCircle,
      color: "text-pink-500",
      bgColor: "bg-pink-50",
    },
  ];

  return (
    <div className="space-y-8 mb-8">
      {/* User Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">User Management</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {userStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">{stat.title}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Job Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Management</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {jobStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">{stat.title}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;