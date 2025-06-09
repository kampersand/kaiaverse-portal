'use client';

import { useState, useEffect } from 'react';
import type { Event } from '../api/events/route';

export default function EventsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('获取事件列表失败');
        }
        const data = await response.json();
        setEvents(data.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取事件列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filters = [
    { id: 'all', name: '全部活动' },
    { id: 'ongoing', name: '进行中' },
    { id: 'upcoming', name: '即将开始' },
    { id: 'past', name: '已结束' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'past':
        return 'text-gray-600';
      case 'ongoing':
        return 'text-green-600';
      case 'upcoming':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'past':
        return '已结束';
      case 'ongoing':
        return '进行中';
      case 'upcoming':
        return '即将开始';
      default:
        return status;
    }
  };

  const filteredEvents = events.filter(event => 
    activeFilter === 'all' || event.status === activeFilter
  );

  return (
    <div className="py-12">
      <div className="max-w-[1440px] mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Kaia 活动日历</h1>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧活动列表 */}
          <div className="lg:w-1/2">
            <div className="flex space-x-4 mb-8">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
                {error}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{event.title}</h3>
                          <span className={`text-sm font-medium ${getStatusColor(event.status)}`}>
                            {getStatusText(event.status)}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">📅 {event.date}</p>
                        <p className="text-gray-600 mb-2">📍 {event.location}</p>
                        <p className="text-gray-700 mb-4">{event.description}</p>
                      </div>
                      <a
                        href={event.registrationLink}
                        className={`px-4 py-2 rounded-md ${
                          event.status === 'past'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                        onClick={(e) => {
                          if (event.status === 'past') {
                            e.preventDefault();
                          }
                        }}
                      >
                        {event.status === 'past' ? '活动已结束' : '报名参加'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧 Luma 日历嵌入 */}
          <div className="lg:w-1/2 h-[calc(100vh-200px)] sticky top-8">
            <iframe
              src="https://lu.ma/embed/calendar/cal-Zxd3NPs07srlXc3/events"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: '1px solid #bfcbda88', borderRadius: '4px' }}
              allowFullScreen
              aria-hidden="false"
              tabIndex={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 