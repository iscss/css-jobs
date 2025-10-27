import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Bell, Briefcase, Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SignupPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SignupPromptModal: React.FC<SignupPromptModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleSignUp = () => {
        onClose();
        navigate('/auth?tab=signup');
    };

    const benefits = [
        {
            icon: <Heart className="w-5 h-5 text-red-500" />,
            title: "Save Jobs",
            description: "Bookmark interesting positions for later review"
        },
        {
            icon: <Bell className="w-5 h-5 text-blue-500" />,
            title: "Job Alerts",
            description: "Get notified when new jobs match your interests"
        },
        {
            icon: <Briefcase className="w-5 h-5 text-green-500" />,
            title: "Post Jobs",
            description: "Share opportunities with the CSS community"
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Join CSS Jobs Today!
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Unlock powerful features to supercharge your job search and career in computational social science.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Benefits List */}
                    <div className="grid gap-3">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                                <div className="flex-shrink-0 mt-0.5">
                                    {benefit.icon}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{benefit.title}</h4>
                                    <p className="text-sm text-gray-600">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Call to Action */}
                    <div className="flex flex-col gap-2 pt-2">
                        <Button onClick={handleSignUp} className="w-full">
                            Sign Up - It's Free!
                        </Button>
                        <Button variant="outline" onClick={onClose} className="w-full">
                            Maybe Later
                        </Button>
                    </div>

                    {/* Trust Badge */}
                    <div className="text-center pt-2">
                        <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Trusted by CSS researchers worldwide
                        </Badge>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SignupPromptModal; 