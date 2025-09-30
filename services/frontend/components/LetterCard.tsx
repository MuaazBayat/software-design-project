import { MessageRow } from '@/lib/MessagingApiClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Clock, 
  Heart,
  Flag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useState } from 'react';

interface LetterCardProps {
  message: MessageRow;
  currentUserId: string | undefined;
  onReportMessage?: (messageId: string, reportedUserId: string, violationType: string) => void;
}

export default function LetterCard({ message, currentUserId, onReportMessage }: LetterCardProps) {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState('inappropriate_content');
  const [reportLoading, setReportLoading] = useState(false);

  const formatDeliveryTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeliveryStatus = (message: MessageRow) => {
    if (message.read_at) {
      return { status: 'Read', color: 'bg-green-100 text-green-800', icon: Heart };
    }
    const deliveryTime = new Date(message.scheduled_delivery_at);
    const now = new Date();
    
    if (deliveryTime <= now) {
      return { status: 'Delivered', color: 'bg-blue-100 text-blue-800', icon: Mail };
    }
    return { status: 'Sending...', color: 'bg-orange-100 text-orange-800', icon: Clock };
  };

  const isMyMessage = (message: MessageRow) => {
    return message.sender_id === currentUserId;
  };

  const getFontClass = (fontFamily?: string) => {
    switch (fontFamily?.toLowerCase()) {
      case 'handwritten':
        return 'font-serif';
      case 'typewriter':
        return 'font-mono';
      case 'cursive':
        return 'font-serif italic';
      case 'formal':
        return 'font-serif';
      default:
        return 'font-sans';
    }
  };

  const handleReportMessage = async () => {
    if (!onReportMessage || !message.message_id || !message.sender_id) return;
    
    setReportLoading(true);
    
    try {
      await onReportMessage(message.message_id, message.sender_id, selectedViolation);
      setShowReportDialog(false);
      // Reset to default for next time
      setSelectedViolation('inappropriate_content');
    } catch (error) {
      console.error('Error reporting message:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const openReportDialog = () => {
    setShowReportDialog(true);
  };

  const statusInfo = getDeliveryStatus(message);
  const StatusIcon = statusInfo.icon;
  const isMine = isMyMessage(message);
  const fontClass = getFontClass(message.letter_styles?.font_family);
  const fontSize = message.letter_styles?.font_size || 16;

  return (
    <>
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-8`}>
        <div className={`w-125 max-w-[90vw] ${isMine ? 'ml-12' : 'mr-12'}`}>
          {/* Letter Envelope Shadow */}
          <div className="relative">
            {/* Paper texture background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 transform rotate-1 rounded-sm opacity-30" />
            
            {/* Main Letter - Fixed Height */}
            <Card className={`
              bg-gradient-to-br from-white to-stone-50 
              border-2 ${isMine ? 'border-blue-200' : 'border-rose-200'}
              shadow-xl relative overflow-hidden h-150 flex flex-col
              before:absolute before:inset-0 before:opacity-5
              before:bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)]
              before:bg-[length:20px_20px]
            `}>
              {/* Letter Header with Letterhead Style */}
              <div className="relative bg-gradient-to-r from-white to-gray-50 px-6 py-4 border-b border-gray-200 flex-shrink-0">
                {/* Decorative Corner Elements */}
                <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-gray-300 opacity-30" />
                <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-gray-300 opacity-30" />
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-2 h-2 rounded-full ${isMine ? 'bg-blue-500' : 'bg-rose-500'}
                    `} />
                    <div>
                      <span className={`
                        text-sm font-semibold ${isMine ? 'text-blue-900' : 'text-rose-900'}
                      `}>
                        {isMine ? 'From: You' : 'From: Your Pen Pal'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Letter #{message.message_sequence}
                      </div>
                    </div>
                  </div>
                  
                  {/* Postmark Style Status and Report Button */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`${statusInfo.color} text-xs px-2 py-0.5 rounded-full border-2 border-dashed`}>
                      <StatusIcon className="h-2.5 w-2.5 mr-1" />
                      {statusInfo.status}
                    </Badge>
                    
                    {/* Report Message Button - Only show for other user's messages */}
                    {!isMine && onReportMessage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-gray-400 hover:text-rose-500"
                          >
                            <Flag className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={openReportDialog}>
                            <Flag className="h-4 w-4 mr-2" />
                            Report Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Delivery time */}
                <div className="text-xs text-gray-500 text-right mt-1">
                  {formatDeliveryTime(message.scheduled_delivery_at)}
                </div>

                {/* Vintage Postmark */}
                <div className={`
                  absolute -top-3 -right-3 w-12 h-12 rounded-full border-3 border-dashed
                  ${isMine ? 'border-blue-300 bg-blue-50' : 'border-rose-300 bg-rose-50'}
                  opacity-20 transform rotate-12
                `}>
                  <Mail className={`w-4 h-4 m-auto mt-4 ${isMine ? 'text-blue-400' : 'text-rose-400'}`} />
                </div>
              </div>

              {/* Letter Content Area - Scrollable */}
              <div className="relative flex-1 overflow-y-auto">
                <div className="px-6 py-6 h-full">
                  {/* Lined Paper Effect */}
                  <div className="absolute left-6 right-6 top-0 bottom-0">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-full border-b border-blue-100 opacity-30"
                        style={{ top: `${(i + 1) * 24}px` }}
                      />
                    ))}
                  </div>
                  
                  {/* Red Margin Line */}
                  <div className="absolute left-12 top-0 bottom-0 w-px bg-red-200 opacity-40" />
                  
                  {/* Letter Content */}
                  <div className="relative z-10">
                    <div className={`
                      ${fontClass}
                      text-gray-800 leading-relaxed
                      ${message.letter_styles?.font_family === 'handwritten' ? 'tracking-wide' : ''}
                      ${message.letter_styles?.font_family === 'typewriter' ? 'tracking-wider' : ''}
                    `}
                    style={{
                      fontSize: `${Math.min(fontSize, 14)}px`,
                      lineHeight: '1.5'
                    }}>
                      {/* Letter salutation for non-first messages */}
                      {message.message_sequence && message.message_sequence > 1 && (
                        <div className="mb-3 text-gray-600 text-sm">
                          <em>Dear friend,</em>
                        </div>
                      )}
                      
                      {/* Main content with proper letter indentation */}
                      <div className="pl-6 text-sm">
                        {message.message_content}
                      </div>
                      
                      {/* Letter closing */}
                      <div className="mt-4 text-right pr-4">
                        <div className="text-gray-600 italic text-xs">
                          {isMine ? 'Yours truly,' : 'With warm regards,'}
                        </div>
                        <div className={`mt-1 ${fontClass} ${isMine ? 'text-blue-800' : 'text-rose-800'} font-semibold text-sm`}>
                          {isMine ? 'You' : 'Your Pen Pal'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Letter Footer with Vintage Elements */}
              <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Written {new Date(message.scheduled_delivery_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>#{message.message_sequence}</span>
                    {message.letter_styles?.font_family && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{message.letter_styles.font_family}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Paper Fold Effects */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
                {/* Top fold line */}
                <div className="absolute top-3 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-20" />
                {/* Side fold shadows */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-r from-gray-200 to-transparent opacity-10" />
                <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-l from-gray-200 to-transparent opacity-10" />
              </div>
            </Card>

            {/* Drop shadow underneath */}
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-gray-400 rounded-sm opacity-10 -z-10" />
          </div>
        </div>
      </div>

      {/* Report Message Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Message</AlertDialogTitle>
            <AlertDialogDescription>
              Why are you reporting this message? This will help our moderation team review the issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Violation Type</label>
              <select 
                value={selectedViolation}
                onChange={(e) => setSelectedViolation(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              >
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="hate_speech">Hate Speech</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reportLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReportMessage}
              disabled={reportLoading}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {reportLoading ? 'Reporting...' : 'Report Message'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}