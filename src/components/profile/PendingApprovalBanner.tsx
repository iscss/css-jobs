import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PendingApprovalBannerProps {
  userEmail: string;
}

export const PendingApprovalBanner = ({ userEmail }: PendingApprovalBannerProps) => {
  const [showModal, setShowModal] = useState(false);
  const emailDomain = userEmail?.split('@')[1] || '';
  const isUniversityEmail = emailDomain.endsWith('.edu') ||
                           emailDomain.includes('.ac.') ||
                           emailDomain.endsWith('.edu.au');

  return (
    <>
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <AlertTitle className="text-yellow-900 font-semibold">Approval Pending</AlertTitle>
        <AlertDescription className="text-yellow-800 space-y-2">
          <p>
            Your account is pending admin approval before you can post jobs.
          </p>
          {!isUniversityEmail && (
            <div className="mt-3 space-y-2">
              <p className="font-medium">
                <Mail className="w-4 h-4 inline mr-1" />
                Have a university email address?
              </p>
              <p className="text-sm">
                Users with verified university emails ({userEmail.split('@')[0]}@university.edu)
                are automatically approved to post jobs.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                className="mt-2 border-yellow-300 text-yellow-900 hover:bg-yellow-100"
              >
                Learn More
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>University Email Verification</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                To streamline the approval process, we automatically verify users with
                university email addresses from our database of 10,500+ educational institutions worldwide.
              </p>
              <p className="font-medium text-foreground">
                If you have a university email address:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Sign up with your university email (e.g., @stanford.edu, @ox.ac.uk)</li>
                <li>You'll be automatically approved to post jobs</li>
                <li>Your jobs will still require admin review before going live</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-4">
                Currently using: <span className="font-mono bg-muted px-2 py-1 rounded">{userEmail}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                If you don't have a university email, an admin will review your request manually.
                This typically takes 1-2 business days.
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
