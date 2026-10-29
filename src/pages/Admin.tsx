
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PendingApprovalCard from "@/components/admin/PendingApprovalCard";
import PendingJobFilters, {
  applyPendingFilters,
  EMPTY_PENDING_FILTERS,
  type PendingFilters,
} from "@/components/admin/PendingJobFilters";
import PendingJobApprovalCard from "@/components/admin/PendingJobApprovalCard";
import UserManagementTable from "@/components/admin/UserManagementTable";
import JobManagementTable from "@/components/admin/JobManagementTable";
import {
  EMPTY_JOB_FILTERS,
  type JobManagementFilters,
} from "@/components/admin/JobManagementFilters";
import AdminStats from "@/components/admin/AdminStats";
import BulkActionBar from "@/components/admin/BulkActionBar";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminApprovals } from "@/hooks/useAdminApprovals";
import { usePendingJobs } from "@/hooks/useJobManagement";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Clock, Briefcase } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { data: pendingApprovals, isLoading: approvalsLoading } = useAdminApprovals();
  const { data: pendingJobs, isLoading: pendingJobsLoading } = usePendingJobs();
  const [pendingFilters, setPendingFilters] =
    useState<PendingFilters>(EMPTY_PENDING_FILTERS);

  // Filtering runs client-side: the queue is already loaded, so this stays
  // instant and avoids a refetch on every keystroke.
  const visiblePendingJobs = useMemo(
    () => applyPendingFilters(pendingJobs ?? [], pendingFilters),
    [pendingJobs, pendingFilters],
  );
  // Bulk selection for the pending queue. Only jobs currently shown count, so
  // a job hidden by a filter can never be approved by accident.
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());
  const selectedPendingJobs = useMemo(
    () => visiblePendingJobs.filter((j) => selectedPendingIds.has(j.id)),
    [visiblePendingJobs, selectedPendingIds],
  );
  const allPendingSelected =
    visiblePendingJobs.length > 0 && selectedPendingJobs.length === visiblePendingJobs.length;
  const togglePendingJob = (id: string, on: boolean) =>
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAllPending = (on: boolean) =>
    setSelectedPendingIds(on ? new Set(visiblePendingJobs.map((j) => j.id)) : new Set());
  // Changing a filter starts a fresh selection.
  useEffect(() => {
    setSelectedPendingIds(new Set());
  }, [pendingFilters]);

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approvals');
  const [jobFilters, setJobFilters] = useState<JobManagementFilters>(EMPTY_JOB_FILTERS);

  // Clicking a dashboard card (Published, Rejected, ...) opens Job Management
  // with that filter already selected, then brings the tabs into view.
  const openJobs = (patch: Partial<JobManagementFilters>) => {
    setJobFilters({ ...EMPTY_JOB_FILTERS, ...patch });
    setActiveTab('jobs');
    requestAnimationFrame(() =>
      document.getElementById('admin-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-brand-navy" />
                  <h1 className="text-4xl font-bold text-brand-navy">
                    Admin Dashboard
                  </h1>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-gray-600 text-lg">
                  Manage user approvals, permissions, and job posts
                </p>
              </div>
            </div>
          </div>

          <AdminStats onTabChange={setActiveTab} onOpenJobs={openJobs} />

          <Tabs id="admin-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                      <>
                        <PendingJobFilters
                          jobs={pendingJobs}
                          filters={pendingFilters}
                          onChange={setPendingFilters}
                          resultCount={visiblePendingJobs.length}
                        />
                        {visiblePendingJobs.length > 0 ? (
                          <>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
                              <Checkbox
                                checked={allPendingSelected ? true : selectedPendingJobs.length > 0 ? 'indeterminate' : false}
                                onCheckedChange={(v) => toggleAllPending(v === true)}
                                aria-label="Select all shown jobs"
                              />
                              Select all {visiblePendingJobs.length} shown
                            </label>
                            {visiblePendingJobs.map((job) => (
                              <div key={job.id} className="flex items-start gap-3">
                                <Checkbox
                                  className="mt-6"
                                  checked={selectedPendingIds.has(job.id)}
                                  onCheckedChange={(v) => togglePendingJob(job.id, v === true)}
                                  aria-label={`Select ${job.title}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <PendingJobApprovalCard job={job} />
                                </div>
                              </div>
                            ))}
                            <BulkActionBar
                              selectedJobs={selectedPendingJobs}
                              onClear={() => setSelectedPendingIds(new Set())}
                            />
                          </>
                        ) : (
                          <div className="text-center py-6 bg-gray-50 rounded-lg border">
                            <Briefcase className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                            <h3 className="text-md font-medium text-gray-700 mb-1">
                              No jobs match these filters
                            </h3>
                            <p className="text-gray-500 text-sm">
                              {pendingJobs.length} job{pendingJobs.length === 1 ? '' : 's'} are
                              still pending — try clearing a filter.
                            </p>
                          </div>
                        )}
                      </>
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
                      <Badge variant="outline" className="border-brand-navy/30 text-brand-navy bg-brand-surface-2">
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
              <JobManagementTable filters={jobFilters} onFiltersChange={setJobFilters} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
