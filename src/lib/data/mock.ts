export const MOCK_CHATS = [
    {
        id: '1',
        name: 'Tushar Khatri',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tushar',
        lastMessage: 'Project kab start kar rahe ho?',
        time: '10:30 AM',
        unread: 2,
        online: true
    },
    {
        id: '2',
        name: 'Rahul Sharma',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
        lastMessage: 'Design files bhej di hain maine.',
        time: 'Yesterday',
        unread: 0,
        online: false
    },
    {
        id: '3',
        name: 'Design Team',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=DT',
        lastMessage: 'Meeting shift ho gayi hai.',
        time: 'Yesterday',
        unread: 5,
        online: false,
        isGroup: true
    }
];

export const MOCK_MESSAGES = [
    {
        id: 'm1',
        senderId: 'contact',
        text: 'Hi bro, kaisa hai?',
        timestamp: '10:00 AM',
        status: 'read'
    },
    {
        id: 'm2',
        senderId: 'me',
        text: 'Bas badhiya. Tu bata?',
        timestamp: '10:05 AM',
        status: 'read'
    },
    {
        id: 'm3',
        senderId: 'contact',
        text: 'Project kab start kar rahe ho?',
        timestamp: '10:30 AM',
        status: 'received'
    }
];
