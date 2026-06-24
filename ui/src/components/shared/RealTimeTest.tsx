import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/shadcn/button';

export function RealTimeTest() {
  const [status, setStatus] = useState<string>('Not connected');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Test real-time connection
    const channel = supabase
      .channel('test_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_messages'
      }, (payload) => {
        console.log('Real-time test received:', payload);
        setMessages(prev => [...prev, payload]);
        setStatus('Real-time working!');
      })
      .subscribe((status) => {
        console.log('Test subscription status:', status);
        setStatus(`Subscription: ${status}`);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const testMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .insert({
          order_id: 'test-order-id',
          sender_id: 'test-sender',
          receiver_id: 'test-receiver',
          message: 'Test message ' + new Date().toISOString(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('Test insert error:', error);
        setStatus('Insert failed: ' + error.message);
      } else {
        console.log('Test insert success:', data);
        setStatus('Test message sent');
      }
    } catch (error) {
      console.error('Test error:', error);
      setStatus('Test failed');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg p-4 shadow-lg z-50">
      <h3 className="font-semibold mb-2">Real-time Test</h3>
      <p className="text-sm mb-2">Status: {status}</p>
      <Button onClick={testMessage} size="sm" className="mb-2">
        Send Test Message
      </Button>
      <div className="text-xs">
        <p>Messages received: {messages.length}</p>
        {messages.slice(-3).map((msg, i) => (
          <div key={i} className="text-gray-600">
            {msg.event}: {msg.new?.message}
          </div>
        ))}
      </div>
    </div>
  );
} 