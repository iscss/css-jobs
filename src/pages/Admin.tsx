
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PendingApprovalCard from "@/components/admin/PendingApprovalCard";
import UserManagementTable from "@/components/admin/UserManagementTable";
import JobManagementTable from "@/components/admin/JobManagementTable";
import AdminStats from "@/components/admin/AdminStats";
import { useAdminApprovals } from "@/hooks/useAdminApprovals";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Clock, Briefcase } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { data: pendingApprovals, isLoading: approvalsLoading } = useAdminApprovals();
  const navigate = useNavigate();

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
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-indigo-600" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-gray-600 text-lg">
                Manage user approvals, permissions, and job posts
              </p>
            </div>
          </div>

          <AdminStats />

          <Tabs defaultValue="approvals" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="jobs">Job Management</TabsTrigger>
            </TabsList>

            <TabsContent value="approvals">
              <div className="space-y-4">
                {approvalsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
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
                  <div className="text-center py-8 bg-white rounded-lg border">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No pending approvals</h3>
                    <p className="text-gray-600">All user requests have been processed.</p>
                  </div>
                )}
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
