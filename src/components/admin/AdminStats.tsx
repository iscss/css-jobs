import { userCounts } from '@/lib/roles';
import { useAllUsers } from "@/hooks/useUserManagement";
import { useJobCounts } from "@/hooks/useJobManagement";
import { useAdminApprovals } from "@/hooks/useAdminApprovals";
import { Users, Briefcase, Clock, CheckCircle, XCircle, UserCheck, ShieldCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobManagementFilters } from "@/components/admin/JobManagementFilters";

interface AdminStatsProps {
  onTabChange?: (tab: string) => void;
  /** Opens Job Management with these filters applied. */
  onOpenJobs?: (filters: Partial<JobManagementFilters>) => void;
}

const AdminStats = ({ onTabChange, onOpenJobs }: AdminStatsProps) => {
  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: jobCounts, isLoading: jobsLoading } = useJobCounts();
  const { data: pendingApprovals, isLoading: approvalsLoading } = useAdminApprovals();

  // Counted by what an account can do, not by the stored sign-up type. The counts add
  // up: admins + job posters + posting removed = total users.
  const counts = userCounts(users);

  const userStats = [
    {
      title: "Total Users",
      value: usersLoading ? "..." : counts.total,
      icon: Users,
      color: "text-brand-navy",
      bgColor: "bg-brand-surface",
      onClick: () => onTabChange?.('users'),
      clickable: true,
    },
    {
      title: "Admins",
      value: usersLoading ? "..." : counts.admins,
      icon: ShieldCheck,
      color: "text-brand-navy",
      bgColor: "bg-brand-surface",
      onClick: () => onTabChange?.('users'),
      clickable: true,
    },
    {
      title: "Job Posters",
      value: usersLoading ? "..." : counts.posters,
      icon: UserCheck,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      onClick: () => onTabChange?.('users'),
      clickable: true,
    },
    {
      title: "Posting Removed",
      value: usersLoading ? "..." : counts.removed,
      icon: UserX,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      onClick: () => onTabChange?.('users'),
      clickable: true,
    },
    {
      title: "Admin Requests",
      value: approvalsLoading ? "..." : pendingApprovals?.length || 0,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      onClick: () => onTabChange?.('approvals'),
      clickable: true,
    },
  ];

  const jobStats = [
    {
      title: "Total Jobs",
      value: jobsLoading ? "..." : jobCounts?.total ?? 0,
      icon: Briefcase,
      color: "text-brand-navy",
      bgColor: "bg-brand-surface",
      onClick: () => onOpenJobs?.({ status: 'all', featured: false }),
      clickable: true,
    },
    {
      title: "Published Jobs",
      value: jobsLoading ? "..." : jobCounts?.published ?? 0,
      icon: CheckCircle,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
      onClick: () => onOpenJobs?.({ status: 'published', featured: false }),
      clickable: true,
    },
    {
      title: "Pending Review",
      value: jobsLoading ? "..." : jobCounts?.pending ?? 0,
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      onClick: () => onTabChange?.('approvals'),
      clickable: true,
    },
    {
      title: "Rejected Jobs",
      value: jobsLoading ? "..." : jobCounts?.rejected ?? 0,
      icon: XCircle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      onClick: () => onOpenJobs?.({ status: 'rejected', featured: false }),
      clickable: true,
    },
    {
      title: "Featured Jobs",
      value: jobsLoading ? "..." : jobCounts?.featured ?? 0,
      icon: CheckCircle,
      color: "text-brand-navy",
      bgColor: "bg-brand-surface",
      onClick: () => onOpenJobs?.({ status: 'all', featured: true }),
      clickable: true,
    },
  ];

  return (
    <div className="space-y-8 mb-8">
      {/* User Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">User Management</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {userStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className={`bg-white rounded-xl p-4 shadow-lg border border-gray-100 ${
                  stat.clickable
                    ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 hover:border-gray-300'
                    : ''
                }`}
                onClick={stat.onClick}
              >
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {jobStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className={`bg-white rounded-xl p-4 shadow-lg border border-gray-100 ${
                  stat.clickable
                    ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 hover:border-gray-300'
                    : ''
                }`}
                onClick={stat.onClick}
              >
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