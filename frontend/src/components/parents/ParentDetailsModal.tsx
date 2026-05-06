import React, { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { User, Mail, Phone, MapPin, Users, X, Shield, Clock, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { Parent } from '../../services/parentService';

interface ParentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent: Parent | null;
}

const ParentDetailsModal: React.FC<ParentDetailsModalProps> = ({
  isOpen,
  onClose,
  parent
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Return null if not open to avoid any rendering overhead when hidden
  if (!isOpen || !parent) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`max-w-3xl overflow-y-auto max-h-[90vh] bg-white text-gray-900 border-none shadow-2xl ${isMobile ? 'p-4' : 'p-6'}`}
      >
        <DialogHeader className="border-b pb-4 mb-4">
          <div className="flex items-center gap-4 text-left">
            <Avatar className="h-16 w-16 border-2 border-indigo-100 shrink-0">
              <AvatarImage src={parent.profileImage} alt={`${parent.firstName} ${parent.lastName}`} />
              <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xl font-bold">
                {`${(parent.firstName ?? '').charAt(0)}${(parent.lastName ?? '').charAt(0)}`}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-bold text-gray-900 truncate">
                {parent.firstName} {parent.lastName}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(parent.status)}>
                  {parent.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500 italic shrink-0">ID: {parent.id}</span>
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Detailed information for parent {parent.firstName} {parent.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
          {/* Left Column: Personal Information */}
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <User className="h-4 w-4" /> Personal Information
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-medium">Email Address</p>
                    <p className="text-sm text-gray-900 font-medium break-all">{parent.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                    <p className="text-sm text-gray-900 font-medium">{parent.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Home Address</p>
                    <p className="text-sm text-gray-900 font-medium leading-relaxed">{parent.address || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Joined Date</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {parent.createdAt ? new Date(parent.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', month: 'long', day: 'numeric' 
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Children Information */}
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" /> Linked Children
                </h3>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                  {parent.children?.length || 0} Total
                </Badge>
              </div>
              
              <div className="space-y-3">
                {parent.children && parent.children.length > 0 ? (
                  parent.children.map((child) => (
                    <div 
                      key={child.id} 
                      className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
                    >
                      <Avatar className="h-12 w-12 border border-gray-200 shrink-0">
                        <AvatarImage src={child.photo} alt={`${child.firstName} ${child.lastName}`} />
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-medium">
                          {`${(child.firstName ?? '').charAt(0)}${(child.lastName ?? '').charAt(0)}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {child.firstName} {child.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                            {child.class}
                          </span>
                          {child.admissionNumber && (
                            <span className="text-xs text-gray-400 truncate">#{child.admissionNumber}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">No children linked to this account</p>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-700 uppercase mb-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Security Actions
              </h4>
              <div className="flex flex-col gap-2">
                <TouchFriendlyButton variant="outline" size="sm" className="bg-white text-xs h-9 justify-start">
                  Reset Account Password
                </TouchFriendlyButton>
                <TouchFriendlyButton variant="outline" size="sm" className="bg-white text-xs h-9 justify-start">
                  View Account Activity
                </TouchFriendlyButton>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <TouchFriendlyButton 
            onClick={onClose}
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
          >
            Close Details
          </TouchFriendlyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ParentDetailsModal);
