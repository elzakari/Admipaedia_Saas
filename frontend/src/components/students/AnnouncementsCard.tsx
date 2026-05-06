import React from 'react';
import { Card, List, Button, Empty, Skeleton } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAnnouncementWebSocket } from '../../services/announcementWebSocketService';

interface AnnouncementsCardProps {
  classId?: number;
}

const AnnouncementsCard: React.FC<AnnouncementsCardProps> = ({ classId }) => {
  const navigate = useNavigate();
  const { announcements, isConnected } = useAnnouncementWebSocket(classId);
  
  // Show only the 5 most recent announcements
  const recentAnnouncements = announcements.slice(0, 5);
  const isLoading = !isConnected; // Use isConnected as a proxy for loading state
  
  return (
    <Card 
      title="Recent Announcements" 
      extra={<Button type="link" onClick={() => navigate('/announcements')}>View All</Button>}
      className="h-full shadow-md"
    >
      <Skeleton loading={isLoading} active paragraph={{ rows: 4 }}>
        {recentAnnouncements.length > 0 ? (
          <List
            dataSource={recentAnnouncements}
            renderItem={(announcement: { title: any; content: string; }) => (
              <List.Item>
                <List.Item.Meta
                  title={announcement.title}
                  description={announcement.content.length > 100 
                    ? `${announcement.content.substring(0, 100)}...` 
                    : announcement.content}
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            description="No recent announcements" 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        )}
      </Skeleton>
      
      <div className="mt-4 text-center">
        <Button 
          type="primary" 
          icon={<BellOutlined />} 
          onClick={() => navigate('/announcements')}
        >
          All Announcements
        </Button>
      </div>
    </Card>
  );
};

export default AnnouncementsCard;