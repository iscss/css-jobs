
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PendingApprovalCard from "@/components/admin/PendingApprovalCard";
import PendingJobApprovalCard from "@/components/admin/PendingJobApprovalCard";
import UserManagementTable from "@/components/admin/UserManagementTable";
import JobManagementTable from "@/components/admin/JobManagementTable";
import AdminStats from "@/components/admin/AdminStats";
import { useAdminApprovals } from "@/hooks/useAdminApprovals";
import { usePendingJobs } from "@/hooks/useJobManagement";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Clock, Briefcase, RefreshCw } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { data: pendingApprovals, isLoading: approvalsLoading } = useAdminApprovals();
  const { data: pendingJobs, isLoading: pendingJobsLoading } = usePendingJobs();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approvals');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all admin-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-jobs-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['all-jobs-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user-profiles'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      ]);

      // Keep spinning for visual effect, then show success toast
      setTimeout(() => {
        setIsRefreshing(false);
        toast({
          title: "Dashboard refreshed",
          description: "All data has been updated successfully.",
        });
      }, 800);
    } catch (error) {
      setIsRefreshing(false);
      toast({
        title: "Refresh failed",
        description: "There was an error refreshing the dashboard.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="page-wrapper">
      <Header />

      <main className="main-content">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-indigo-600" />
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`
                    relative overflow-hidden px-6 py-2 
                    bg-gradient-to-r from-indigo-500 to-purple-600 
                    hover:from-indigo-600 hover:to-purple-700
                    text-white font-medium rounded-xl
                    shadow-lg hover:shadow-xl
                    transform transition-all duration-300
                    hover:scale-105 hover:-translate-y-0.5
                    disabled:opacity-70 disabled:cursor-not-allowed
                    disabled:transform-none disabled:hover:shadow-lg
                    ${isRefreshing ? 'animate-pulse shadow-indigo-500/50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 relative z-10">
                    <RefreshCw
                      className={`
                        w-4 h-4 transition-all duration-500
                        ${isRefreshing ? 'animate-spin text-white drop-shadow-sm' : 'text-white/90'}
                      `}
                    />
                    <span className="transition-all duration-300">
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </span>
                  </div>

                  {/* Animated background effects */}
                  {isRefreshing && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/30 to-purple-500/30 animate-pulse" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-xl blur animate-ping" />
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600 text-lg">
                  Manage user approvals, permissions, and job posts
                </p>
                <p className="text-sm text-gray-500 italic">
                  Use the refresh button above to get the most recent updates from users and jobs
                </p>
              </div>
            </div>
          </div>

          <AdminStats />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="approvals">
                Pending Approvals
                {((pendingApprovals?.length || 0) + (pendingJobs?.length || 0)) > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
                    {(pendingApprovals?.length || 0) + (pendingJobs?.length || 0)}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="jobs">
                Job Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approvals">
              <div className="space-y-6">
                {/* Pending Job Approvals */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Pending Job Approvals
                    {pendingJobs && pendingJobs.length > 0 && (
                      <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100">
                        {pendingJobs.length}
                      </Badge>
                    )}
                  </h2>
                  <div className="space-y-4">
                    {pendingJobsLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="bg-white rounded-lg p-6 shadow-sm border">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-32" />
                              </div>
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : pendingJobs && pendingJobs.length > 0 ? (
                      pendingJobs.map((job) => (
                        <PendingJobApprovalCard
                          key={job.id}
                          job={job as any}
                        />
                      ))
                    ) : (
                      <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                        <Briefcase className="w-10 h-10 text-green-500 mx-auto mb-2" />
                        <h3 className="text-md font-medium text-green-700 mb-1">No pending job approvals</h3>
                        <p className="text-green-600 text-sm">All job submissions have been reviewed.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending User Approvals */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Pending User Approvals
                    {pendingApprovals && pendingApprovals.length > 0 && (
                      <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-100">
                        {pendingApprovals.length}
                      </Badge>
                    )}
                  </h2>
                  <div className="space-y-4">
                    {approvalsLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="bg-white rounded-lg p-6 shadow-sm border">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-48" />
                              </div>
                              <div className="flex gap-2">
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-8 w-20" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : pendingApprovals && pendingApprovals.length > 0 ? (
                      pendingApprovals.map((profile) => (
                        <PendingApprovalCard
                          key={profile.id}
                          profile={profile}
                        />
                      ))
                    ) : (
                      <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                        <Users className="w-10 h-10 text-green-500 mx-auto mb-2" />
                        <h3 className="text-md font-medium text-green-700 mb-1">No pending user approvals</h3>
                        <p className="text-green-600 text-sm">All user requests have been processed.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <UserManagementTable />
            </TabsContent>

            <TabsContent value="jobs">
              <JobManagementTable />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
