import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Modal, Button, Tooltip } from 'antd';
import { Announcement } from '../../services/announcementService';
import { CalendarEvent } from '../../services/calendarService';
import { format, parseISO, isSameDay } from 'date-fns';
import { PlusOutlined } from '@ant-design/icons';
import EnhancedAnnouncementForm from '../admin/EnhancedAnnouncementForm';
import type { Dayjs } from 'dayjs';

interface AnnouncementCalendarIntegrationProps {
  announcements: Announcement[];
  events: CalendarEvent[];
  userRole: string;
  classId?: number;
  onCreateEvent?: () => void;
}

const AnnouncementCalendarIntegration: React.FC<AnnouncementCalendarIntegrationProps> = ({
  announcements,
  events,
  userRole,
  classId,
  onCreateEvent
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createAnnouncementVisible, setCreateAnnouncementVisible] = useState(false);
  const [dateItems, setDateItems] = useState<Array<Announcement | CalendarEvent>>([]);

  // When a date is selected, filter items for that date
  useEffect(() => {
    if (!selectedDate) {
      setDateItems([]);
      return;
    }

    // Filter announcements scheduled for the selected date
    const dateAnnouncements = announcements.filter(announcement => {
      if (!announcement.scheduled_date) return false;
      const announcementDate = parseISO(announcement.scheduled_date);
      return isSameDay(announcementDate, selectedDate);
    });

    // Filter calendar events for the selected date
    const dateEvents = events.filter(event => {
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, selectedDate);
    });

    setDateItems([...dateAnnouncements, ...dateEvents]);
  }, [selectedDate, announcements, events]);

  // Function to get cell data for the calendar
  const cellRender = (date: Dayjs) => {
    const jsDate = date.toDate();
    
    // Count announcements for this date
    const announcementCount = announcements.filter(announcement => {
      if (!announcement.scheduled_date) return false;
      const announcementDate = parseISO(announcement.scheduled_date);
      return isSameDay(announcementDate, jsDate);
    }).length;

    // Count events for this date
    const eventCount = events.filter(event => {
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, jsDate);
    }).length;

    // Render badges if there are items
    return (
      <div className="calendar-cell">
        {announcementCount > 0 && (
          <Badge count={announcementCount} style={{ backgroundColor: '#1890ff' }} />
        )}
        {eventCount > 0 && (
          <Badge count={eventCount} style={{ backgroundColor: '#52c41a' }} />
        )}
      </div>
    );
  };

  // Handle date selection
  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date.toDate());
    setModalVisible(true);
  };

  // Render the modal content
  const renderModalContent = () => {
    if (!selectedDate) return null;

    return (
      <div>
        <h3>{format(selectedDate, 'MMMM d, yyyy')}</h3>
        
        {dateItems.length === 0 ? (
          <p>No announcements or events scheduled for this date.</p>
        ) : (
          <div className="date-items">
            {dateItems.map((item, index) => {
              // Check if item is an Announcement
              if ('content' in item) {
                const announcement = item as Announcement;
                return (
                  <div key={`announcement-${announcement.id}`} className="date-item announcement">
                    <Badge color="blue" text={`Announcement: ${announcement.title}`} />
                    <p>{announcement.content}</p>
                  </div>
                );
              } else {
                // It's a CalendarEvent
                const event = item as CalendarEvent;
                return (
                  <div key={`event-${event.id}`} className="date-item event">
                    <Badge color="green" text={`${event.type}: ${event.title}`} />
                    <p>{event.description}</p>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* Show create buttons for admins and teachers */}
        {(userRole === 'admin' || userRole === 'teacher') && (
          <div className="mt-4 flex space-x-2">
            <Button 
              type="primary" 
              onClick={() => {
                setModalVisible(false);
                setCreateAnnouncementVisible(true);
              }}
            >
              Create Announcement for this Date
            </Button>
            
            {onCreateEvent && (
              <Button onClick={() => {
                setModalVisible(false);
                onCreateEvent();
              }}>
                Create Event
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="announcement-calendar-integration">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Calendar</h2>
        {(userRole === 'admin' || userRole === 'teacher') && (
          <Tooltip title="Create Announcement">
            <Button 
              type="primary" 
              shape="circle" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateAnnouncementVisible(true)} 
            />
          </Tooltip>
        )}
      </div>
      
      <Calendar 
        fullscreen={false} 
        cellRender={cellRender}
        onSelect={handleDateSelect} 
      />
      
      <Modal
        title="Date Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {renderModalContent()}
      </Modal>
      
      <Modal
        title="Create Scheduled Announcement"
        open={createAnnouncementVisible}
        onCancel={() => setCreateAnnouncementVisible(false)}
        footer={null}
        width={700}
      >
        <EnhancedAnnouncementForm 
          classId={classId} 
          onSuccess={() => setCreateAnnouncementVisible(false)} 
        />
      </Modal>
    </div>
  );
};

export default AnnouncementCalendarIntegration;