import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PostOpportunitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PostOpportunitiesModal = ({ isOpen, onClose }: PostOpportunitiesModalProps) => {
  const navigate = useNavigate();

  const handleSignInClick = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Post Research Opportunities
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-gray-600">
            To post job opportunities, you need to sign in and request job posting privileges.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Post research positions and opportunities</li>
              <li>• Manage your job postings</li>
              <li>• Access to applicant management tools (coming soon)</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSignInClick} className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Sign In to Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostOpportunitiesModal;