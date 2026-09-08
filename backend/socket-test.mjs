import { io } from 'socket.io-client';

// Replace these with your actual tokens and conversation ID
const USER_A_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXRtdzk5YnEwMDAweDB1MHRmcnIwdmtuIiwiZW1haWwiOiJhc2hpc2hAZXhhbXBsZS5jb20iLCJpYXQiOjE3ODg4NzcwOTgsImV4cCI6MTc4OTQ4MTg5OH0.6J6OZFgx_TvIE8sFReUixD7VFeglyKcIMnj2O-6m_JI';
const USER_B_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbXRwdDg1a2IwMDAwaHd1MHptNGU1d2RsIiwiZW1haWwiOiJ1c2VyMkBleGFtcGxlLmNvbSIsImlhdCI6MTc4ODg3ODExMCwiZXhwIjoxNzg5NDgyOTEwfQ.7mQku6kZr9b5iLCN7c1PDnqWztJ3UUMFWMqh7HH_9pk';
const CONVERSATION_ID = 'cmtptbdaa0001hwu0f07o2lcu';

// --- USER A ---
const socketA = io('http://localhost:4000', { auth: { token: USER_A_TOKEN } });
socketA.on('connect', () => console.log('✅ User A connected'));

// User A joins the conversation to listen for events
socketA.emit('conversation:join', { conversationId: CONVERSATION_ID });
socketA.on('conversation:presence', (data) => console.log('👥 User A initial presence:', data));
socketA.on('user:presence', (data) => console.log('🟢🔴 User A sees presence update:', data));
socketA.on('typing:update', (data) => console.log('⌨️ User A sees typing:', data));

// --- USER B ---
const socketB = io('http://localhost:4000', { auth: { token: USER_B_TOKEN } });
socketB.on('connect', () => {
  console.log('✅ User B connected');
  // User B joins the conversation
  socketB.emit('conversation:join', { conversationId: CONVERSATION_ID });
});

// After 3 seconds, User B starts typing
setTimeout(() => {
  console.log('\n⌨️ User B starts typing...');
  socketB.emit('typing:start', { conversationId: CONVERSATION_ID });
}, 3000);

// After 6 seconds, User B stops typing
setTimeout(() => {
  console.log('⌨️ User B stops typing...');
  socketB.emit('typing:stop', { conversationId: CONVERSATION_ID });
}, 6000);

// After 9 seconds, User B disconnects (goes offline)
setTimeout(() => {
  console.log('\n🔴 User B disconnecting...');
  socketB.disconnect();
}, 9000);