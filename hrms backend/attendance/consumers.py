import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models_chat import ChatRoom, Message, UserStatus

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope['user']

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Update user status to online
        await self.update_user_status(True)

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Update user status to offline
        await self.update_user_status(False)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'chat_message':
            message = text_data_json['message']
            
            # Save message to database
            message_obj = await self.save_message(message)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': message_obj.id,
                        'sender': {
                            'id': self.user.id,
                            'email': self.user.email,
                            'first_name': self.user.first_name,
                            'last_name': self.user.last_name
                        },
                        'content': message_obj.content,
                        'timestamp': message_obj.timestamp.isoformat(),
                        'is_read': message_obj.is_read,
                        'is_me': False
                    }
                }
            )
        
        elif message_type == 'typing':
            # Forward typing indicator to the other user
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing',
                    'user_id': self.user.id,
                    'is_typing': text_data_json.get('is_typing', False)
                }
            )
        
        elif message_type == 'message_read':
            # Mark messages as read
            message_ids = text_data_json.get('message_ids', [])
            await self.mark_messages_as_read(message_ids)

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message
        }))
    
    # Handle typing indicators
    async def typing(self, event):
        # Don't send typing status back to the sender
        if self.user.id != event['user_id']:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'is_typing': event['is_typing']
            }))
    
    # Handle message read receipts
    async def message_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_ids': event['message_ids']
        }))
    
    @database_sync_to_async
    def save_message(self, content):
        room = ChatRoom.objects.get(id=self.room_name)
        message = Message.objects.create(
            room=room,
            sender=self.user,
            content=content
        )
        room.save()  # Update the room's updated_at timestamp
        return message
    
    @database_sync_to_async
    def mark_messages_as_read(self, message_ids):
        Message.objects.filter(
            id__in=message_ids,
            room_id=self.room_name
        ).exclude(sender=self.user).update(is_read=True)
    
    @database_sync_to_async
    def update_user_status(self, is_online):
        user_status, _ = UserStatus.objects.get_or_create(user=self.user)
        user_status.is_online = is_online
        user_status.save()
