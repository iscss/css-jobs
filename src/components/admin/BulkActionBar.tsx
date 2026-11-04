import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useBulkJobAction } from '@/hooks/useJobManagement';
import {
  MAX_BULK,
  partitionForBulk,
  summarizeSkipped,
  type BulkAction,
  type BulkJob,
} from '@/lib/bulkActions';

interface Props {
  /** The jobs currently ticked. */
  selectedJobs: BulkJob[];
  onClear: () => void;
}

/**
 * Sticky bar that appears once something is ticked. Approving publishes jobs
 * to the public site, so both actions ask for confirmation first and say
 * exactly how many jobs they will change and how many they will skip.
 */
const BulkActionBar = ({ selectedJobs, onClear }: Props) => {
  const [pending, setPending] = useState<BulkAction | null>(null);
  const bulk = useBulkJobAction();

  if (selectedJobs.length === 0) return null;

  const approve = partitionForBulk(selectedJobs, 'approve');
  const reject = partitionForBulk(selectedJobs, 'reject');
  const current = pending ? (pending === 'approve' ? approve : reject) : null;
  const tooMany = (current?.eligible.length ?? 0) > MAX_BULK;

  const confirm = () => {
    if (!pending || !current || tooMany) return;
    bulk.mutate(
      { ids: current.eligible.map((j) => j.id), action: pending },
      { onSuccess: onClear, onSettled: () => setPending(null) },
    );
  };

  return (
    <>
      <div
        className="sticky bottom-4 z-30 mx-auto my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-navy/30 bg-white px-4 py-3 shadow-lg"
        role="region"
        aria-label="Bulk actions"
      >
        <span className="text-sm font-medium text-gray-800">
          {selectedJobs.length} selected
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={approve.eligible.length === 0 || bulk.isPending}
            onClick={() => setPending('approve')}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve ({approve.eligible.length})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={reject.eligible.length === 0 || bulk.isPending}
            onClick={() => setPending('reject')}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject ({reject.eligible.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear} disabled={bulk.isPending}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'approve'
                ? `Approve and publish ${current?.eligible.length} job${current?.eligible.length === 1 ? '' : 's'}?`
                : `Reject ${current?.eligible.length} job${current?.eligible.length === 1 ? '' : 's'}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {pending === 'approve' ? (
                  <p>
                    These jobs will be visible on the public job board straight away.
                  </p>
                ) : (
                  <p>
                    Rejected jobs are taken off the public site if they were published.
                    Auto-imported jobs are deleted automatically 30 days after they are
                    rejected.
                  </p>
                )}
                {current && current.skipped.length > 0 && (
                  <p className="text-amber-700">
                    {current.skipped.length} selected job
                    {current.skipped.length === 1 ? ' is' : 's are'} skipped:{' '}
                    {summarizeSkipped(current.skipped)}.
                  </p>
                )}
                {tooMany && (
                  <p className="text-red-700">
                    That is more than {MAX_BULK} jobs. Narrow the selection and try again.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulk.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              disabled={bulk.isPending || tooMany}
              className={pending === 'reject' ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700'}
            >
              {bulk.isPending ? 'Working…' : pending === 'approve' ? 'Approve and publish' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionBar;
