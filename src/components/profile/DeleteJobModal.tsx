import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;

interface DeleteJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (jobId: string) => void;
  isDeleting?: boolean;
}

const DeleteJobModal = ({ job, isOpen, onClose, onConfirm, isDeleting = false }: DeleteJobModalProps) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  if (!job) return null;

  const handleConfirmDelete = () => {
    if (deleteConfirmation.toLowerCase() === 'delete') {
      onConfirm(job.id);
      setDeleteConfirmation('');
      onClose();
    }
  };

  const handleClose = () => {
    setDeleteConfirmation('');
    onClose();
  };

  const isConfirmationValid = deleteConfirmation.toLowerCase() === 'delete';

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <AlertDialogTitle className="text-red-600">Delete Job Post</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>
              You are about to permanently delete the job post:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-semibold text-red-800">{job.title}</p>
              <p className="text-sm text-red-600">{job.location}</p>
            </div>
            <p className="text-sm">
              <strong>This action cannot be undone.</strong> All data associated with this job post will be permanently removed.
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation" className="text-sm font-medium">
                Type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> to confirm:
              </Label>
              <Input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="border-red-300 focus:border-red-500 focus:ring-red-500"
                disabled={isDeleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={!isConfirmationValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Job Post'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteJobModal;